var express = require('express');
var passport = require('passport');
var passportLocal = require('passport-local');
var passportAdmin = require('passport');
var passportLocalAdmin = require('passport-local');
var mongoose = require('mongoose');
var router = express.Router();
var uploadManager = require('./uploadManager')(router);
var captchapng = require('captchapng');
var bcrypt = require('bcrypt-nodejs');
var pos = require('pos');
var gingerbread = require('gingerbread');
var request = require('request');
var cheerio = require('cheerio');
var cron = require('cron');
var timeseries = require("timeseries-analysis");

var FuzzySearch = require('fuzzysearch-js');
var levenshteinFS = require('fuzzysearch-js/js/modules/LevenshteinFS');
var indexOfFS = require('fuzzysearch-js/js/modules/IndexOfFS');
var wordCountFS = require('fuzzysearch-js/js/modules/WordCountFS');

var schema = require('../schema/schema');
var models = require('../models/models');

var salt = bcrypt.genSaltSync(10);

var LanguageDetect = require('languagedetect');
var lngDetector = new LanguageDetect();



//Passport
passport.use('main', new passportLocal.Strategy({
    usernameField: 'email',
    passwordField: 'password'
}, verifyCredentials));

function verifyCredentials(username, password, done) {

   schema.member.find({email:username}).lean().exec(function (err, docs){
    if(err) res.json(err);
    else
    {

       if(docs[0] != null) 
       {

        var check = bcrypt.compareSync(password, docs[0].password);
        if(check)
            done(null, { id: username, name: docs[0].name });

        else
            done(null, null);

    }

    else
        done(null, null);


}
});

}

passport.serializeUser(function(user, done) {
    done(null, user.id);
});

passport.deserializeUser(function(id, done) {
    // Query database or cache here!
    schema.member.find({email:id}).lean().exec(function (err, docs){
        if(err) res.json(err);
        else
        {

           if(docs[0].activated == 1 && docs[0] != null) 
           {
            done(null, { email: id, name: docs[0].name, id: docs[0]._id, type:docs[0].admin });
        }

        else
        {
            done(null, null);
        }

    }
});
});
//Passport Ends


/* GET home page. */
router.get('/', function(req, res) {

    var test = "test";
    var anchordata = new Array();
    var today = new Date();
    today.setDate(today.getDate());
    var limit = new Date();
    limit.setDate(limit.getDate() - 15);

  //  schema.article.find({created: {"$lte": today, "$gte": limit}}).lean().exec(function (err, docs){
    schema.article.find({created: {"$lte": today, "$gte": limit}}).where('language').equals('english').where('pending').equals(0).where('hide').equals(0).sort({created: 'descending'}).lean().exec(function (err, docs){
        if(err) res.json(err);
        schema.trend.find({}).sort({"created": -1}).limit(1).lean().exec(function (err, data){
            if(err) console.log(err);
            else
            {
                function render() {
                    res.render('index', {
                        articles: docs,
                        isAuthenticated: req.isAuthenticated(),
                        user: req.user,
                        test: data
                    });
                }
                if(req.isAuthenticated())
                {
                    test = "best";
                }
                render();
                //updateAll()
            }
        });
    });
});

router.get('/profile/:memberid', function(req, res) {

   // if( typeof req.user !== "undefined" )
   schema.member.find({_id:req.params.memberid}).lean().exec(function (err, docs){
    if(err) res.json(err);
    else
    {
        var memid = JSON.stringify(req.params.memberid);
        schema.article.find({memberid:memid}).sort({created: 'descending'}).lean().exec(function (err, arcs){
            if(err) res.json(err);
            else
            {

                console.log(docs[0].rate);
                res.render('profile', {
                    meminfo: docs[0],
                    arcinfo: arcs,
                    isAuthenticated: req.isAuthenticated(),
                    user: req.user
                });
            }
        });
    }
});
});

router.get('/profile/:memberid/edit', function(req, res) {

    if(req.params.memberid == req.user.id)
    {
        schema.member.find({_id:req.params.memberid}).lean().exec(function (err, docs){
            if(err) res.json(err);
            else    res.render('editprofile', {
                meminfo: docs[0],
                isAuthenticated: req.isAuthenticated(),
                user: req.user
            });
        });
    }
    else
    {
        res.redirect('/');
    }
});


router.post('/profile/:memberid/edit', function(req, res){
    schema.member.update({_id: req.params.memberid},
    {
      name: req.body.name,
      dob   : req.body.dob,
      profileimage : req.body.profileimage
  }, function(err, docs){
    if(err) res.json(err);
    else    res.redirect('/profile/'+req.params.memberid);
});
});



router.get('/write', function(req, res) {
    res.render('write', {
        isAuthenticated: req.isAuthenticated(),
        user: req.user
    });
});


router.get('/data', function(req, res) {

    schema.trend.find({}).sort({"created": -1}).lean().exec(function (err, list){
        if(err) console.log(err);
        else
        {   
            var trendWord = [];
            var trendMa = [];
            var word = list[0].trend.split(" ");
            var freq = list[0].frequency.split(" ");
            var ratio = new Array();
            for(var i=0; i < 5; i++)
            {

                var data = new Array();
                var a =new Array();
      //  console.log(word[0]);
      for(var j=48; j >= 0; j--)
      {
        a=[];
        var oldWord = list[j].trend.split(" ");
        var oldFreq = list[j].frequency.split(" ");
        var flag=0;
        a.push(list[j].created);
        for(k in oldWord)
        {
            //console.log(word[i]);
            if(word[i] == oldWord[k])
            {

                a.push(parseInt(oldFreq[k]));

                flag=1;
            }
        }
        if(flag==0)
        {
            a.push(parseFloat(0.1));
        } 
     //console.log(a.length);
     data.push(a);
 }


 trendWord.push(data);
 var t     = new timeseries.main(data);

//console.log(t);
var processed = t.lwma({
    period:   10
}).output();

ratio[i] = [];
for(n in data)
{

    ratio[i].push(data[n][1]/processed[n][1]);


}
trendMa.push(processed)
}

//console.log(ratio.length);
//console.log(ratio[0].length);
//console.log(trendMa);
            //res.send(trendWord);

            

            res.render('data', {
                isAuthenticated: req.isAuthenticated(),
                user: req.user,
                trendList: trendWord,
                maList: trendMa,
                words: word,
                ratio: ratio
            }); 
        }
    });

});




router.post('/new', function(req, res) {

    var tags = models.generatedTags(req.body.headline,req.body.mainsection);
    var today = new Date();
    today.setDate(today.getDate());
    var t = today.toString();

    var lang = lngDetector.detect(req.body.headline + " " + req.body.mainsection)[0][0];

    var r=0;
    if(lang == "bengali") r=5;

    new schema.article({
        headline    : req.body.headline,
        mainsection: req.body.mainsection,
        memberid: req.body.memberid,
        membername: req.body.membername ,
        primaryimage: req.body.primaryimage,
        summary: req.body.summary,
        category: req.body.category,
        ranking:0,
        pending: 1,
        created: today,
        updated: t,
        rate: r,
        tags: tags,
        count:1,
        hide: 0,
        click:0,
        language: lang           
    }).save(function(err, doc){
        if(err) res.json(err);
        else {
            dbcallarticles();
            res.redirect('/');
        }
    });

});

router.get('/view', function(req, res){

    var test = "test";
    var anchordata = new Array();
    var today = new Date();
    today.setDate(today.getDate());
    var limit = new Date();
    limit.setDate(limit.getDate() - 15);
    schema.article.find({created: {"$lte": today, "$gte": limit}}).where('language').equals('english').where('pending').equals(0).where('hide').equals(0).lean().exec(function (err, docs){
        if(err) res.json(err);
        else    res.render('partialview', {articles: docs});
    });
});

router.get('/article/:articleid', function(req, res) {

   // if( typeof req.user !== "undefined" )

   schema.article.find({_id:req.params.articleid}).where('hide').equals(0).lean().exec(function (err, docs){
    if(err) res.json(err);
    else 
    {   
        if(docs[0] != undefined) {
            var temp = JSON.stringify(req.params.articleid);
            schema.comment.find({articleid:temp}).sort({created: 'descending'}).where('hide').equals(0).lean().exec(function (err, comments){
                if(err) res.json(err);
                else {
                    console.log(req.params.articleid);
                    if(req.user === undefined) temp = "0";
                    else temp= req.user.id;


                    schema.vote.find({memberid:temp,articleid:req.params.articleid}).lean().exec(function (err, vot){
                        if(err) res.json(err);
                        else 
                        {   
                        //console.log(vot);
                        var eligible;
                        if(vot[0]==null) eligible=1;
                        else eligible=0;
                        console.log("click " + docs[0].click);
                        var newClick = docs[0].click + 1;
                        console.log(newClick);
                        schema.article.update({_id: req.params.articleid},
                        {
                            click: newClick
                        }, function(err, done){ 

                            console.log(comments);
                            res.render('article', {
                                arcinfo: docs[0],
                                commentinfo: comments,
                                eligible:eligible,
                                isAuthenticated: req.isAuthenticated(),
                                user: req.user
                            });
                        });
                        
                    } 
                });

/*   */
}

});
}

else res.redirect('/');

}

});
});


router.get('/article/:articleid/edit', function(req, res) {

  // if(req.params.memberid == req.user.id)
  var memid="0";
  schema.article.find({_id:req.params.articleid}).lean().exec(function (err, docs){
    if(err) res.json(err);
    else 
    {

     memid = docs[0].memberid; 


     if((req.user != null) && (memid === JSON.stringify(req.user.id)))
     {

         res.render('editarticle', {
            arcinfo: docs[0],
            isAuthenticated: req.isAuthenticated(),
            user: req.user
        });
     }
     else
     {
        res.redirect('/');
    }
}

});

});


router.post('/article/:articleid/edit', function(req, res){

  // console.log(req.body.mainsection);
  // console.log(req.params.articleid);
  var today = new Date();
  today.setDate(today.getDate());
  var t = today.toString();
  console.log(typeof t);
  if(req.body.primaryimage == undefined) req.body.primaryimage="";
   //console.log(today);
   schema.article.update({_id: req.params.articleid},
   {
      headline: req.body.headline,
      mainsection: req.body.mainsection,
      summary: req.body.summary,
      primaryimage: req.body.primaryimage,
      updated: t
  }, function(err, docs){
    if(err) console.log(err);
    else 
        res.redirect('/article/'+req.params.articleid);
});
});


router.post('/commentpost', function(req, res) {
    new schema.comment({
        comment    : req.body.comment,
        articleid: req.body.articleid,
        memberid: req.body.memberid,
        membername: req.body.membername,
        hide: 0              
    }).save(function(err, doc){
        if(err) res.json(err);
        else
        {
            console.log(req.body.comment);
            res.redirect('/article/' + req.body.articleid.replace(/['"]+/g, ''));
        }
    });
});


/*router.post('/deletecomment', function(req, res){
    comment.remove({_id: req.body.deletecommentid}, 
     function(err){
        if(err) res.json(err);
        else    res.redirect('/article/' + req.body.articleid);
    });
}); */

router.post('/deletecomment', function(req, res){
    schema.comment.update({_id: req.body.deletecommentid}, {
        hide:1
    },
    function(err){
        if(err) res.json(err);
        else    res.redirect('/article/' + req.body.articleid);
    });
});

router.post('/postvote', function(req, res) {
    var rate =  parseInt(req.body.vote);
    var count;
    var finalrate;
    schema.article.find({_id:req.body.articleid.replace(/['"]+/g, '')}).lean().exec(function (err, info){
        if(err) res.json(err);
        else 
        {
            count=info[0].count;
            count++;
            finalrate= info[0].rate+rate;
            console.log(info[0].rate);
            console.log(rate);
            console.log(finalrate/count);
            console.log(count);
            schema.article.update({_id: req.body.articleid.replace(/['"]+/g, '')},
            {
                rate: finalrate,
                count: count
            }, function(err, docs){
                if(err) console.log(err);
                else 
                    new schema.vote({
                        rate:rate,
                        articleid: req.body.articleid,
                        memberid: req.body.memberid
                    }).save(function(err, doc){
                        if(err) res.json(err);
                        else res.redirect('/article/' + req.body.articleid.replace(/['"]+/g, ''));
                    }); 
                });
        }

    });

});


router.get('/register', function(req, res) {
    if(!req.isAuthenticated())
    {
        number = parseInt(Math.random()*9000+1000);
        var captchaImg = function(){
        var p = new captchapng(80,30,number); // width,height,numeric captcha
        p.color(115, 95, 197, 100);  // First color: background (red, green, blue, alpha)
        p.color(30, 104, 21, 255); // Second color: paint (red, green, blue, alpha)
        var img = p.getBase64();
        var imgbase64 = new Buffer(img,'base64');
        return imgbase64;
    }

    var valicode = new Buffer(captchaImg()).toString('base64');
    number = (number * 1321) + 103399;  
    res.render('register', {
        isAuthenticated: req.isAuthenticated(),
        user: req.user,
        valicode : valicode,
        capnumber : number
    });
}

else
    res.redirect('/login');
});

router.post('/register', function(req, res) {

    schema.member.find({email:req.body.email}).lean().exec(function (err, docs){
        if(err) res.json(err);
        else
        {

           if(docs[0] != null) 
           {
            res.redirect('/register');
        }

        else
        {
            var temp = (parseInt(req.body.regnumber-103399))/1321;
            console.log(temp);
            temp = temp.toString();
            if(req.body.captchaval == temp)
            {
                var hash = bcrypt.hashSync(req.body.password, salt);
                new schema.member({
                    name    : req.body.name,
                    email: req.body.email,
                    dob: req.body.dob,
                    password: hash,
                    admin:0,
                    activated:1,
                    rate: 0,
                    joindate: Date.now()             
                }).save(function(err, doc){
                    if(err) res.json(err);
                    else res.redirect('/');
                });
            }
            else res.redirect('/register');
        }


    }
});

});


router.get('/bengali', function(req, res) {

   // if( typeof req.user !== "undefined" )
   var message = "বাংলা সংস্করণ";
   var test = "test";
   var anchordata = new Array();
   var today = new Date();
   today.setDate(today.getDate());
   var limit = new Date();
   limit.setDate(limit.getDate() - 30);
   schema.article.find({created: {"$lte": today, "$gte": limit}}).where('language').equals('bengali').where('hide').equals(0).sort({created: 'descending'}).lean().exec(function (err, docs){
    if(err) res.json(err);
    else
    {

        console.log(docs);
        res.render('view', {
            articles: docs,
            isAuthenticated: req.isAuthenticated(),
            user: req.user,
            message: message
        });


    }
});
});


router.get('/bangladesh', function(req, res) {

   // if( typeof req.user !== "undefined" )
   var message = "Bangladesh";
   var test = "test";
   var anchordata = new Array();
   var today = new Date();
   today.setDate(today.getDate());
   var limit = new Date();
   limit.setDate(limit.getDate() - 30);
   schema.article.find({created: {"$lte": today, "$gte": limit}}).where('category').equals('Bangladesh').where('hide').equals(0).sort({created: 'descending'}).lean().exec(function (err, docs){
    if(err) res.json(err);
    else
    {

        console.log(docs);
        res.render('view', {
            articles: docs,
            isAuthenticated: req.isAuthenticated(),
            user: req.user,
            message: message
        });


    }
});
});


router.get('/world', function(req, res) {

   // if( typeof req.user !== "undefined" )
   var message = "World";
   var test = "test";
   var anchordata = new Array();
   var today = new Date();
   today.setDate(today.getDate());
   var limit = new Date();
   limit.setDate(limit.getDate() - 30);
   schema.article.find({created: {"$lte": today, "$gte": limit}}).where('category').equals('World').where('hide').equals(0).sort({created: 'descending'}).lean().exec(function (err, docs){
    if(err) res.json(err);
    else
    {

        console.log(docs);
        res.render('view', {
            articles: docs,
            isAuthenticated: req.isAuthenticated(),
            user: req.user,
            message: message
        });


    }
});
});


router.get('/economy', function(req, res) {

   // if( typeof req.user !== "undefined" )
   var message = "Economy";
   var test = "test";
   var anchordata = new Array();
   var today = new Date();
   today.setDate(today.getDate());
   var limit = new Date();
   limit.setDate(limit.getDate() - 30);
   schema.article.find({created: {"$lte": today, "$gte": limit}}).where('category').equals('Economy').where('hide').equals(0).sort({created: 'descending'}).lean().exec(function (err, docs){
    if(err) res.json(err);
    else
    {

        console.log(docs);
        res.render('view', {
            articles: docs,
            isAuthenticated: req.isAuthenticated(),
            user: req.user,
            message: message
        });


    }
});
});


router.get('/science', function(req, res) {

   // if( typeof req.user !== "undefined" )
   var message = "Science";
   var test = "test";
   var anchordata = new Array();
   var today = new Date();
   today.setDate(today.getDate());
   var limit = new Date();
   limit.setDate(limit.getDate() - 30);
   schema.article.find({created: {"$lte": today, "$gte": limit}}).where('category').equals('Science').where('hide').equals(0).sort({created: 'descending'}).lean().exec(function (err, docs){
    if(err) res.json(err);
    else
    {

        console.log(docs);
        res.render('view', {
            articles: docs,
            isAuthenticated: req.isAuthenticated(),
            user: req.user,
            message: message
        });


    }
});
});

router.get('/technology', function(req, res) {

   // if( typeof req.user !== "undefined" )
   var message = "Technology";
   var test = "test";
   var anchordata = new Array();
   var today = new Date();
   today.setDate(today.getDate());
   var limit = new Date();
   limit.setDate(limit.getDate() - 30);
   schema.article.find({created: {"$lte": today, "$gte": limit}}).where('category').equals('Technology').where('hide').equals(0).sort({created: 'descending'}).lean().exec(function (err, docs){
    if(err) res.json(err);
    else
    {

        console.log(docs);
        res.render('view', {
            articles: docs,
            isAuthenticated: req.isAuthenticated(),
            user: req.user,
            message: message
        });


    }
});
});

router.get('/entertainment', function(req, res) {

   // if( typeof req.user !== "undefined" )
   var message = "Entertainment";
   var test = "test";
   var anchordata = new Array();
   var today = new Date();
   today.setDate(today.getDate());
   var limit = new Date();
   limit.setDate(limit.getDate() - 30);
   schema.article.find({created: {"$lte": today, "$gte": limit}}).where('category').equals('Entertainment').where('hide').equals(0).sort({created: 'descending'}).lean().exec(function (err, docs){
    if(err) res.json(err);
    else
    {

        console.log(docs);
        res.render('view', {
            articles: docs,
            isAuthenticated: req.isAuthenticated(),
            user: req.user,
            message: message
        });


    }
});
});


router.get('/sports', function(req, res) {

   // if( typeof req.user !== "undefined" )
   var message = "Sports";
   var test = "test";
   var anchordata = new Array();
   var today = new Date();
   today.setDate(today.getDate());
   var limit = new Date();
   limit.setDate(limit.getDate() - 30);
   schema.article.find({created: {"$lte": today, "$gte": limit}}).where('category').equals('Sports').where('hide').equals(0).sort({created: 'descending'}).lean().exec(function (err, docs){
    if(err) res.json(err);
    else
    {

        console.log(docs);
        res.render('view', {
            articles: docs,
            isAuthenticated: req.isAuthenticated(),
            user: req.user,
            message: message
        });


    }
});
});

router.get('/other', function(req, res) {

   // if( typeof req.user !== "undefined" )
   var message = "Other";
   var test = "test";
   var anchordata = new Array();
   var today = new Date();
   today.setDate(today.getDate());
   var limit = new Date();
   limit.setDate(limit.getDate() - 30);
   schema.article.find({created: {"$lte": today, "$gte": limit}}).where('category').equals('Other').where('hide').equals(0).sort({created: 'descending'}).lean().exec(function (err, docs){
    if(err) res.json(err);
    else
    {

        console.log(docs);
        res.render('view', {
            articles: docs,
            isAuthenticated: req.isAuthenticated(),
            user: req.user,
            message: message
        });


    }
});
});

router.get('/personalizednews/:memberid', function(req, res) {

    var message = "Articles recommended for you";
    schema.member.find({_id:req.params.memberid}).lean().exec(function (err, docs){
        if(err) res.json(err);
        else
        {

//{ $in : [recomData] }
//recomData[0]
var recomData = docs[0].personalizednews.split(",");
var i = recomData.length;

for(i in recomData){
    if(recomData[i]=="")
    {
        recomData.splice(i,1);
    }
}
console.log(recomData.length);
schema.article.find({'_id': { $in: recomData}}).lean().exec(function (err, arcs){

    if(err)console.log(err);
    console.log(arcs);
        //data.push(arcs);
        res.render('view', {
            articles: arcs,
            isAuthenticated: req.isAuthenticated(),
            user: req.user,
            message: message
        }); 

    });

        //console.log(data[0]._id);
    }
});   
});


router.get('/login', function(req, res) {
    if(!req.isAuthenticated())
        res.render('login', {
            isAuthenticated: req.isAuthenticated(),
            user: req.user
        });
    else
        res.redirect('/');
});

router.post('/login', passport.authenticate('main', {
  failureRedirect: '/login',
  successRedirect: '/'
}));

router.get('/logout', function(req, res) {
    req.logout();
    res.redirect('/');
});



router.get('/search', function (req, res){


    var rawQuery = req.query['query'];

    var words = new pos.Lexer().lex(rawQuery);
    var taggedWords = new pos.Tagger().tag(words);
    var query = new Array();
    var properNoun = new Array();
    for (i in taggedWords) {
        var taggedWord = taggedWords[i];
        var word = taggedWord[0];
        var tag = taggedWord[1];
        if(tag =="NN" || tag =="NNP" || tag =="NNPS" || tag =="NNS" || tag =="FW" || tag =="JJ" || tag =="JJR" || tag =="JJS" || tag =="POS" || tag =="RB" || tag =="RBR" || tag =="RBS" || tag =="RP" || tag =="VB" || tag =="VBD" || tag =="VBG" || tag =="VBN" || tag =="VBP" || tag =="VBZ" || word =="WHO")
        {
            if(tag =="NN" || tag =="NNP" || tag =="NNPS" || tag =="NNS")
            {
                console.log(word);
                properNoun.push(word);
            }
            query.push(word);
        }
    }
   // query = query.replace(/\s{2,}/g, ' ');
   // query = query.split(' ');

   var today = new Date();
   today.setDate(today.getDate());
   var limit = new Date();
   limit.setDate(limit.getDate() - 365);
   if(query != undefined || query != null) {
    schema.article.find({created: {"$lte": today, "$gte": limit}}).where('hide').equals('0').lean().exec(function (err, info){
       // console.log(info);
       for(i in info)
       {
        var data = info[i].mainsection;
        data = data.split(" ");
        //console.log(data);
        var fuzzySearch = new FuzzySearch(data, {'minimumScore': 0});
        fuzzySearch.addModule(levenshteinFS({'maxDistanceTolerance': 3, 'factor': 2}));
        fuzzySearch.addModule(indexOfFS({'minTermLength': 3, 'maxIterations': 500, 'factor': 4}));
        fuzzySearch.addModule(wordCountFS({'maxWordTolerance': 3, 'factor': 1}));
        var sum=0;
        for(j in query)
        {    
            var result = fuzzySearch.search(query[j]);
            if(result == null)break;
            sum = sum+result[0].score;
            //console.log(result[0]);
        }
        info[i].score = sum/(query.length+1);
        
    }

    var swapped;
    do {
        swapped = 0;
        for (var z=0; z < info.length-1; z++) {
            if (info[z].score < info[z+1].score) {

                var temp = info[z];
                info[z] = info[z+1];
                info[z+1] = temp; 

                swapped = 1;
            }
        }
    } while (swapped);

    if(info[0].score >= 240)
    {
        var match = info[0].headline + " " + info[0].mainsection; 
        match = match.split(" ");
        var suggestions = new Array();
        var fuzzySearch = new FuzzySearch(match, {'minimumScore': 0});
        fuzzySearch.addModule(levenshteinFS({'maxDistanceTolerance': 3, 'factor': 2}));
        fuzzySearch.addModule(indexOfFS({'minTermLength': 3, 'maxIterations': 500, 'factor': 4}));
        fuzzySearch.addModule(wordCountFS({'maxWordTolerance': 3, 'factor': 1}));
        for(j in properNoun)
        {    
            var result = fuzzySearch.search(properNoun[j]);
            if(result == null)break;
            console.log(properNoun[j] + " " + result[0].value + " " + result[0].score);
            if(result[0].score < 700)
            {
                suggestions.push(result[0].value);
            } 
        }
    }

    for(i in info) console.log(info[i]._id + " " + info[i].score);

        res.render('search', {
            isAuthenticated: req.isAuthenticated(),
            user: req.user,
            data: info,
            query: query,
            suggestions: suggestions
        });

});
}

   // res.render('search.ejs')

});


router.post('/search', function (req, res){ 

    var obj = {};
    var lim = parseInt(req.body.count);
    var newLim =parseInt(req.body.count)+365;
    req.body.count =parseInt(req.body.count)+365;
    console.log('body: ' + JSON.stringify(req.body.count));
    var query =req.body.query;
    var newData;
    query = query.replace(/\s{2,}/g, ' ');
    query = query.split(' ');
    
    var l1 = new Date();
    l1.setDate(l1.getDate() -lim);
    var l2 = new Date();
    l2.setDate(l2.getDate() - newLim);
    if(query != undefined || query != null) {
        schema.article.find({created: {"$lte": l1, "$gte": l2}}).where('hide').equals('0').lean().exec(function (err, info){
       // console.log(info);
       req.body.adnan="nuruddin";
       for(i in info)
       {
        var data = info[i].mainsection;
        data = data.split(" ");
        //console.log(data);
        var fuzzySearch = new FuzzySearch(data, {'minimumScore': 0});
        fuzzySearch.addModule(levenshteinFS({'maxDistanceTolerance': 3, 'factor': 2}));
        fuzzySearch.addModule(indexOfFS({'minTermLength': 3, 'maxIterations': 500, 'factor': 4}));
        fuzzySearch.addModule(wordCountFS({'maxWordTolerance': 3, 'factor': 1}));
        var sum=0;
        for(j in query)
        {    
            var result = fuzzySearch.search(query[j]);
            if(result == null)break;
            sum = sum+result[0].score;
        }
        info[i].score = sum/(query.length+1);
        
    }

    var swapped;
    do {
        swapped = 0;
        for (var z=0; z < info.length-1; z++) {
            if (info[z].score < info[z+1].score) {

                var temp = info[z];
                info[z] = info[z+1];
                info[z+1] = temp; 

                swapped = 1;
            }
        }
    } while (swapped);
    req.body.newinfo = info;
    for(i in info) console.log(info[i]._id + " " + info[i].score);

        res.send(req.body);


});

}

});


module.exports = router;


//admin panel

router.get('/mspanel', function(req, res) {
    if(req.isAuthenticated() && req.user.type >0)
    {
        res.render('mspanel/main', {
            isAuthenticated: req.isAuthenticated(),
            user: req.user
        });
    }  

    else res.redirect('/');
    
});


router.get('/mspanel/idsearch', function(req, res) {
    if(req.isAuthenticated() && req.user.type >0)
    {
        res.render('mspanel/idsearch', {
            isAuthenticated: req.isAuthenticated(),
            user: req.user
        });
    }  

    else res.redirect('/');
    
});

router.get('/mspanel/handleroles', function(req, res) {
    if(req.isAuthenticated() && req.user.type ==2)
    {
       schema.member.find({}).where('admin').equals(1).lean().exec(function (err, docs){   

           res.render('mspanel/handleroles', {
            isAuthenticated: req.isAuthenticated(),
            user: req.user,
            admins: docs
        });

       });

   }  

   else res.redirect('/');

});


router.get('/mspanel/reports', function(req, res) {
    if(req.isAuthenticated() && req.user.type ==2)
    {
       schema.report.find({}).where('checked').equals(0).sort({date: 'descending'}).lean().exec(function (err, docs){   

           res.render('mspanel/reports', {
            isAuthenticated: req.isAuthenticated(),
            user: req.user,
            reports: docs
        });

       });

   }  

   else res.redirect('/');

});


router.post('/usersearch', function (req, res){  

   schema.member.find({_id: req.body.id}).lean().exec(function (err, docs){   

    req.body.docs= docs[0];
    res.send(req.body);
});


});





router.post('/articlesearch', function (req, res){  

   schema.article.find({_id: req.body.id}).lean().exec(function (err, docs){   

    req.body.docs= docs[0];
    res.send(req.body);
});


});


router.post('/commentsearch', function (req, res){  

    schema.comment.find({_id: req.body.id}).lean().exec(function (err, docs){   

        req.body.docs= docs[0];
        res.send(req.body);
    });


});

router.post('/userstatus', function (req, res){  
    console.log(req.body.id);

    schema.member.find({_id: req.body.id}).lean().exec(function (err, docs){  
        var change=0;
        if(docs[0].activated==0) change = 1; 
        req.body.status= change;
        schema.member.update({_id:req.body.id},
        {
            activated:change
        },function(err, newdocs){
            if(err) res.json(err);
            else {
             res.send(req.body);
         }
     });

    });
    

});


router.post('/articlestatus', function (req, res){  
    console.log(req.body.id);

    schema.article.find({_id: req.body.id}).lean().exec(function (err, docs){  
        var change=0;
        if(docs[0].hide ==0) change = 1; 
        req.body.status= change;
        schema.article.update({_id:req.body.id},
        {
            hide:change
        },function(err, docs){
            if(err) res.json(err);
            else res.send(req.body);
        });

    });
    

});

router.post('/commentstatus', function (req, res){  
    console.log(req.body.id);

    schema.comment.find({_id: req.body.id}).lean().exec(function (err, docs){  
        var change=0;
        if(docs[0].hide ==0) change = 1; 
        req.body.status= change;
        schema.comment.update({_id:req.body.id},
        {
            hide:change
        },function(err, docs){
            if(err) res.json(err);
            else res.send(req.body);
        });

    });
    

});

router.post('/makeadmin', function (req, res){  

    if(req.user.id != req.body.userid)
    {
        schema.member.update({_id:req.body.userid},
        {
            admin:1
        },function(err, docs){
            if(err) res.json(err);
            else    res.redirect('/mspanel/handleroles');
        });
    }

    else    res.redirect('/mspanel/handleroles');


});

router.post('/removeadmin', function (req, res){  

    schema.member.update({_id:req.body.userid},
    {
        admin:0
    },function(err, docs){
        if(err) res.json(err);
        else    res.redirect('/mspanel/handleroles');
    });
    


});

router.post('/report', function (req, res){  



    new schema.report({
        reporterid: req.body.reporterid,
        reportername: req.body.reportername,
        reportedon: req.body.reportedon,
        reason: req.body.reason,
        type  : req.body.type,
        checked: 0,
        date: Date.now()

    }).save(function(err, doc){
        if(err) res.json(err);
        else {
            console.log("success");
            console.log(doc);
            req.body.success=1;
            res.send(req.body); 
        }
    });  


});


router.post('/reportcheck', function (req, res){  


 schema.report.update({_id:req.body.reportid},
 {
    checked:1
},function(err, docs){
    if(err) res.json(err);
    else    res.redirect('/mspanel/reports');
});


});




//connecting models

function dbcallarticles()
{
    var today = new Date();
    today.setDate(today.getDate());
    var oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    schema.article.find({created: {"$lte": today, "$gte": oneWeekAgo}}).lean().exec(function (err, docs){
        if(err) res.json(err);
        else    
        {
           var data = models.relatedArticles(docs); 
           for(i in data)
           {
            //console.log(docs[i]._id + "->" + data[i][0]);
            schema.article.update({_id: docs[i]._id},
            {
              relatedid: data[i][0],
              relatedheadline: data[i][1],
              relatedimages: data[i][2]
          }, function(err, docs){
            if(err) res.json(err);
            //else console.log(docs);
        }); 
        }
    }
});
    
}


function dbcallarticles2(recomData)
{

    var i = recomData.length;

    for(i in recomData){
        if(recomData[i]=="")
        {
            recomData.splice(i,1);
        }
    }

    console.log(recomData);
    schema.article.find({'_id': { $in: recomData}}).lean().exec(function (err, arcs){

        if(err)console.log(err);
        console.log(arcs);
        //data.push(arcs);
                   /* res.render('view', {
                        articles: arcs,
                        isAuthenticated: req.isAuthenticated(),
                        user: req.user
                    }); */

});
    //console.log(data[0]);
   //console.log(data[0]);
    //return data;
}


function updateAll()
{
 /* schema.member.update({},
  {
    dob:"27 08 1990"
}, {multi: true}, function(err, docs){
    if(err) res.json(err);
    else    console.log("updated");
}); */

schema.member.find({}).lean().exec(function (err, docs){    
    for(i in docs) console.log(docs[i].name + " " + docs[i].rate);
}); 
}