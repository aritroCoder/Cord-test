import { AuthorId, Iroh } from '@number0/iroh'
import { exit } from 'process';

const node = await Iroh.persistent('/home/fishnak/Documents/Coding/js/Iroh/node-storage', { enableDocs: true })

// Using blobs
const blob = await node.blobs.readToBytes('b5efkwlqyqmwtvu7zfb7mnq6mxu36zco5crbwrcuaotww4ob6t4q')
const blob_data = JSON.parse(Buffer.from(blob).toString())
console.log("Data from Blob")
console.log(blob_data)

// Using documents
const docid = '4rml7ekum5oxkyn3mpzw64y6vrw7fnkpne2mk7fjoyjco6v2cg7q'
const authorid = AuthorId.fromString('gr7srfcl3gmb72mmwokh5x4lwwq2nfkklxogt43ze2rjgxv62x7a')
const key = Array.from(Buffer.from("hello_in_place"))

const doc = await node.docs.open(docid)
const entry = await doc.getExact(authorid, key, false)
const fromDocument = await node.blobs.readToBytes(entry.hash)
const fromDocumentData = JSON.parse(Buffer.from(fromDocument).toString())
console.log(`Data from doc:`)
console.log(fromDocumentData)

node.node.shutdown(false)