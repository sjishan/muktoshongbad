var mongoose = require('mongoose');

//Schema
var memberSchema = new mongoose.Schema({
    name: String,
    email: String,
    dob   : String,
    profileimage: String,
    rate: Number,
    password: String,
    personalizednews: String,
    admin: Number,
    activated: Number,
    lastlogin: Date,
    joindate: { type: Date },
});

exports.member = mongoose.model('mem', memberSchema);

var articleSchema = new mongoose.Schema({
    headline: String,
    mainsection: String,
    memberid: String,
    membername: String,
    category: String,
    summary: String,
    tags: String,
    primaryimage: String,
    relatedid: String,
    relatedheadline: String,
    relatedimages: String,
    ranking: Number,
    rate: Number,
    count:Number,
    pending: Number,
    hide: Number,
    click: Number,
    language: String,
    updated: String,
    created: Date
});


exports.article = mongoose.model('art', articleSchema);

var commentSchema = new mongoose.Schema({
    comment: String,
    memberid: String,
    membername: String,
    articleid: String,
    hide: Number,
    created: { type: Date, default: Date.now }
});

exports.comment = mongoose.model('com', commentSchema);

var voteSchema = new mongoose.Schema({
    rate: Number,
    memberid: String,
    articleid: String,
    votedate: { type: Date, default: Date.now }
});

exports.vote = mongoose.model('vot', voteSchema);

var snapshotSchema = new mongoose.Schema({
    store: String,
    name: String
});

exports.snapshot = mongoose.model('sna', snapshotSchema);

var trendSchema = new mongoose.Schema({
    trend: String,
    frequency: String,
    created: { type: Date, default: Date.now }
});

exports.trend = mongoose.model('tre', trendSchema);

var timeseriesSchema = new mongoose.Schema({
    trend: String,
    frequency: String,
    created: { type: Date, default: Date.now }
});

exports.timeseries = mongoose.model('tim', timeseriesSchema);

var reportSchema = new mongoose.Schema({
    reporterid: String,
    reportername: String,
    reportedon: String,
    reason: String,
    type  : String,
    checked: Number,
    date: { type: Date }
});

exports.report = mongoose.model('rep', reportSchema);
//Schema End
