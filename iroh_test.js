import { Iroh } from '@number0/iroh'
import { exit } from 'process';

const node = await Iroh.memory({
    enableDocs: true
})

const data = {
    "Name": "Capt. Aritra Bhaduri",
    "Age": 21,
    "team": "Infantry",
    "Rank": "Captain",
    "Role": "Commander",
    "Unit": "Indian Army",
    "messsage": "Today we killed 3 enemy units. Yay!",
}

// put data to iroh IPFS node
const data_byte_array = Array.from(Buffer.from(JSON.stringify(data)))

const res = await node.blobs.addBytes(data_byte_array)

console.log(`created blob! hash: ${res.hash} size: ${res.size} bytes`)

// read data from iroh IPFS node
const blob = await node.blobs.readToBytes(res.hash)

const blob_data = JSON.parse(Buffer.from(blob).toString())

console.log(blob_data)

// create a blank document in iroh
const doc = await node.docs.create()
const author = await node.authors.default()
console.log(`Created doc ID: ${doc.id()}, author ID: ${author}`)

// put a data againt a key
const key = Array.from(Buffer.from("hello_in_place"))

let dochash = await doc.setBytes(author, key, data_byte_array)
console.log(`Set data in doc: ${dochash}`)

// read the data from iroh doc
const entry = await doc.getExact(author, key, false)
if (entry.hash != dochash){
    console.log("Some goddamn error occured!")
    exit(1)
}
const fromDocument = await node.blobs.readToBytes(entry.hash)
const fromDocumentData = JSON.parse(Buffer.from(fromDocument).toString())

console.log(`Data from doc:`)
console.log(fromDocumentData)