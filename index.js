import { 
    S3Client,
    GetObjectCommand,
    ListBucketsCommand, 
    ListObjectsV2Command
} from "@aws-sdk/client-s3";

const client = new S3Client();

function isOlder(d) {
    const start = new Date('01/05/2023');    
    return new Date(d) < start;
}

async function getObject(bucket, key) {
    const command = new GetObjectCommand({
        Bucket: bucket,
        Key: key
    });
    const response = await client.send(command);
    return { name: key, sse: response.ServerSideEncryption };
}

async function listBuckets() {
    const command = new ListBucketsCommand();
    const response = await client.send(command);
    return response.Buckets.filter(b => isOlder(b.CreationDate)).map(b => b.Name);
}

async function next(bucket, token) {
    const command = new ListObjectsV2Command({
        MaxKeys: 50,
        Bucket: bucket,
        ContinuationToken: token
    });
    const response = await client.send(command);
    return {
        isTruncated: response.IsTruncated,
        token: response.NextContinuationToken,
        keys: response.Contents.filter(c => isOlder(c.LastModified)).map(c => c.Key)
    }
}

async function verify(bucket) {
    let batch = {};
    do {
        batch = await next(bucket, batch.token);
        for (const key of batch.keys) { 
            const obj = await getObject(bucket, key);
            if (!obj.sse) console.log(obj);
        }
    } while (batch.isTruncated)
}

try {
    const buckets = await listBuckets();
    for (const b of buckets) {
        console.log('bucket = ', b);
        await verify(b);
    }
} catch (e) {
    console.error(e);
}
