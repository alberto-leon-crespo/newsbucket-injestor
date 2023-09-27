const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

const { Schema } = mongoose;
const uri = process.env.MONGO_URI;
let connection;

(async () => {
    connection = await mongoose.connect(uri);
    console.log(`Succesful connected to mongodb.`)
})()

function getConnection() {
    return connection;
}

const mediaSchema = new Schema({
    _id: { type: Schema.ObjectId, auto: true },
    name: {type: String, required: true},
    url: {type: String, required: true},
    country: {type: String, required: true},
    type: {type: String, required: true},
    createdAt: {type: Date, default: (new Date()).toISOString()},
    updatedAt: {type: Date, default: (new Date()).toISOString()},
});

const feedSchema = new Schema({
    _id: { type: Schema.ObjectId, auto: true },
    name: {type: String, required: true}, // String is shorthand for {type: String}
    url: {type: String, required: true, unique: true},
    country: {type: String, required: true},
    type: {type: String, required: true},
    createdAt: {type: Date, default: (new Date()).toISOString()},
    updatedAt: {type: Date, default: (new Date()).toISOString()},
});

const newSchema = new Schema({
    _id: { type: Schema.ObjectId, auto: true },
    _feed: { type: Schema.ObjectId, required: true },
    link: {
        type: String,
        unique: true // Especifica que este campo debe ser único
    },
    title: { type: String, required: true },
    description: { type: String },
    content: { type: String },
    content_encoded: { type: String },
    content_encoded_snippet: { type: String },
    content_snippet: { type: String },
    creator: { type: String },
    dc_creator: { type: String },
    categories: { type: Array },
    pubDate: { type: Date },
    comments: { type: String },
    enclosure: { type: Object },
    content_hash: { type: String },
    imgs: { type: Array, default: [] },
    createdAt: {type: Date, default: (new Date()).toISOString()},
    updatedAt: {type: Date, default: (new Date()).toISOString()},
});

const fakeNewSchema = new Schema({
    _id: { type: Schema.ObjectId, auto: true },
    title: { type: String },
    content: { type: String },
    link: { type: String, unique: true },
    imgs: { type: Array, default: [] },
    content_hash: { type: String },
    history: {type: Boolean, default: false },
    createdAt: {type: Date, default: (new Date()).toISOString()},
    updatedAt: {type: Date, default: (new Date()).toISOString()},
});

const imageMetadata = new Schema({
    _id: { type: Schema.ObjectId, auto: true },
    _new: { type: Schema.ObjectId },
    metadata: { type: Schema.Types.Mixed, required: true },
    latitude: { type: Number, required: false },
    longitude: { type: Number, required: false },
    createdAt: {type: Date, default: (new Date()).toISOString()},
    updatedAt: {type: Date, default: (new Date()).toISOString()},
});

const Feed = mongoose.model('Feed', feedSchema, 'feeds');
const Media = mongoose.model('Media', mediaSchema, 'medias');
const New = mongoose.model('New', newSchema, 'news');
const FakeNew = mongoose.model('FakeNew', fakeNewSchema, 'fake_news');
const ImageMetadata = mongoose.model('ImageMetadata', imageMetadata, 'images_metadata');

module.exports = {Feed, Media, New, FakeNew, ImageMetadata, Connection: () => getConnection() }