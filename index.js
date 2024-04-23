import { 
    S3Client,
    ListBucketsCommand,
    CreateBucketCommand,
    PutBucketPolicyCommand,
    PutBucketInventoryConfigurationCommand
} from "@aws-sdk/client-s3";

const start = new Date('01/05/2026');
const client = new S3Client({region: 'us-east-1'});
const dest = process.argv[2] || `inventory-${Date.now()}`;

async function createDest() {
    console.log('create dest bucket', dest);
    const create = new CreateBucketCommand({ 
        Bucket: dest 
    });
    const policy = new PutBucketPolicyCommand({
        Bucket: dest,
        Policy: JSON.stringify({
            Version: "2012-10-17",
            Statement: [{
                Sid: "Inventory",
                Effect: "Allow",
                Principal: {
                    Service: "s3.amazonaws.com",
                },
                Action: "s3:PutObject",
                Resource: `arn:aws:s3:::${dest}/*`,
            }],
        })
    });
    await client.send(create);
    await client.send(policy);
}

async function listBuckets() {
    const command = new ListBucketsCommand();
    const response = await client.send(command);
    return response.Buckets
        .filter(b => b.Name != dest && b.CreationDate < start)
        .map(b => b.Name);
}

async function inventory(bucket) {
    console.log('configuring inventory for ', bucket);
    const id = 'sse';
    const command = new PutBucketInventoryConfigurationCommand({
        Bucket: bucket,
        Id: id,
        InventoryConfiguration: {
            Id: id,
            IsEnabled: true,
            IncludedObjectVersions: 'All',
            Schedule: {
                Frequency: 'Daily'
            },
            OptionalFields: [
                'EncryptionStatus',
                'LastModifiedDate'
            ],
            Destination: {
                S3BucketDestination: {
                    Bucket: `arn:aws:s3:::${dest}`,
                    Format: 'CSV'
                }
            }
        }
    });
    const response = await client.send(command);
}

try {
    await createDest();
    const buckets = await listBuckets();
    for (const b of buckets) {
        await inventory(b);
    }
} catch (e) {
    console.error(e);
}
