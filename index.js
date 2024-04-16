import { 
    S3Client,
    GetObjectCommand,
    ListBucketsCommand, 
    ListObjectsV2Command
} from "@aws-sdk/client-s3";

const client = new S3Client();

async function listBuckets() {
    const command = new ListBucketsCommand();
    const response = await client.send(command);
    return response.Buckets.map(b => b.Name);
}

async function listObjects(bucket) {
    let response = {};
    const objects = [];
    do{
        const next = response.NextContinuationToken;
        const command = new ListObjectsV2Command({
            Bucket: bucket,
            ContinuationToken: next
        });
        response = await client.send(command);        
        objects.push(...response.Contents.map(c => c.Key));
    }while (response.IsTruncated);
    return objects;
}

async function getObject(bucket, key) {
    const command = new GetObjectCommand({
        Bucket: bucket,
        Key: key
    });
    const response = await client.send(command);
    return { name: key, sse: response.ServerSideEncryption };
}

try {
    const buckets = await listBuckets();
    for (const b of buckets) {
        console.log('bucket = ', b);
        const objects = await listObjects(b);
        for (const key of objects) { 
            const obj = await getObject(b, key);
            if (!obj.sse) console.log(obj);
        }
    }
} catch (e) {
    console.error(e);
}
