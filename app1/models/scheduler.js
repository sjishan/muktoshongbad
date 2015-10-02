var request = require('request');
var cheerio = require('cheerio');
var cron = require('cron');
var pos = require('pos');
var _ = require("underscore");
var gingerbread = require('gingerbread');
var Recommender = require('likely');
var kmeans = require('node-kmeans');
var timeseries = require("timeseries-analysis");

var FuzzySearch = require('fuzzysearch-js');
var levenshteinFS = require('fuzzysearch-js/js/modules/LevenshteinFS');
var indexOfFS = require('fuzzysearch-js/js/modules/IndexOfFS');
var wordCountFS = require('fuzzysearch-js/js/modules/WordCountFS');

var schema = require('../schema/schema');

exports.recommendschedule = function () {
  var cronJob = cron.job("0 */59 * * * *", function(){
    var today = new Date();
    today.setDate(today.getDate());
    var limit = new Date();
    limit.setDate(limit.getDate() - 7);

    Recommender.DESCENT_STEPS = 7000;
    Recommender.ALPHA=0.0007;
    Recommender.k=7;
    
    schema.member.find({}).lean().exec(function (err, memdocs){ 

      var inputMatrix= [];
      var rowLabels = []; 
      var colLabels = [];

      schema.vote.find().distinct('articleid', function(error, ids) {

        if(ids[0] != undefined) {
          for(var i=0; i < memdocs.length; i++)
          {
            inputMatrix[i]= [];
            rowLabels.push(memdocs[i]._id);
            for(var j=0; j< ids.length; j++)
            {
              inputMatrix[i].push(0);
              colLabels.push(ids[j]);
            }
          }
          schema.vote.find({}).lean().exec(function (err, docs){
            for(var k=0; k < docs.length; k++){
              for(var i=0; i < inputMatrix.length; i++)
              {
                for(var j=0; j< inputMatrix[i].length; j++)
                {
                  if( (docs[k].memberid == rowLabels[i]) && (docs[k].articleid == colLabels[j]) )
                    inputMatrix[i][j] = docs[k].rate;
                }
              }
            }

            var Model = Recommender.buildModel(inputMatrix, rowLabels, colLabels);
                //console.log(memdocs);

                for(x in memdocs)
                {
                  recommendations = Model.recommendations(memdocs[x]._id);
                  //  console.log(memdocs[x].name);
                  var recomData = "";
                  for(p in recommendations)
                  {
                    if(recommendations[p][1] > 3.5)
                    {
                      if(p == recommendations.length-1)
                      {
                        recomData += recommendations[p][0];
                      }
                      else recomData += recommendations[p][0] + ",";
                    }
                  }    

                  //  console.log(recomData);
                  schema.member.update({_id:memdocs[x]._id}, {
                    personalizednews: recomData
                  }, function(err){
                    if(err) console.log(err);
                    //else  console.log("Personalized News Updated");
                  });
                }
              });
}
});

});

var currentdate = new Date(); 
var datetime = "Recommends: " + currentdate.getDate() + "/"
+ (currentdate.getMonth()+1)  + "/" 
+ currentdate.getFullYear() + " @ "  
+ currentdate.getHours() + ":"  
+ currentdate.getMinutes() + ":" 
+ currentdate.getSeconds();
console.log(datetime);

}); 


cronJob.start();
};



exports.scrapschedule = function () {
  var cronJob = cron.job("0 */14 * * * *", function(){
    // perform operation e.g. GET request http.get() etc.
    var data ="";
    var temp="";

    
    scrap("http://dhakatribune.com/");
    scrap("http://thedailystar.net/");
    scrap("http://theindependentbd.com/");
    scrap("http://newagebd.net/");
    scrap("http://en.prothom-alo.com/");
    scrap("http://bdnews24.com/");

    var currentdate = new Date(); 
    var datetime = "Scraping: " + currentdate.getDate() + "/"
    + (currentdate.getMonth()+1)  + "/" 
    + currentdate.getFullYear() + " @ "  
    + currentdate.getHours() + ":"  
    + currentdate.getMinutes() + ":" 
    + currentdate.getSeconds();
    console.log(datetime);

  }); 


  cronJob.start();
};


exports.trendschedule = function () {
  var cronJob = cron.job("0 */15 * * * *", function(){
    // perform operation e.g. GET request http.get() etc.
    var data ="";
    var temp="";

    schema.snapshot.find({}).exec(function (err, data){
    	if(err) console.log(err);
    	else
    	{
    		
    		var words = _.flatten(_.map(data, function(val) {
    			return _.map(val.store.split(" "), function(val) {
    				return {"word": val, "count": 1};
    			});
    		}));

    		var count = _.reduce(words, function(memo, val) {
    			if (_.isNaN(++memo[val.word])) {
    				memo[val.word] = 1;
    			}
    			return memo;
    		}, {});

    		var word = new Array();
    		var frequency = new Array();
    		var text =""; var ftext="";

    		for(i in count)
    		{
          if( i == null || i== undefined || i=="" || i== " " || i == "Sunday" || i == "Monday" || i == "Tuesday" || i == "Wednesday" || i == "Thursday" || i == "Friday" || i == "Saturday")
          {
            continue;
          }
          else
          {
            word.push(i);

            frequency.push(count[i]);
          }
        }


        var swapped;
        do {
         swapped = false;
         for (var i=0; i < frequency.length-1; i++) {
          if (frequency[i] < frequency[i+1]) {
           var temp = frequency[i];
           frequency[i] = frequency[i+1];
           frequency[i+1] = temp;

           var temp2 = word[i];
           word[i] = word[i+1];
           word[i+1] = temp2;
           swapped = true;
         }
       }
     } while (swapped); 

     var fuzzWord = new Array();
     var fuzzFreq = new Array();
     var count=0;
     for(i in word)
     {
      if(word[i].length != 1)
      {
        fuzzWord.push(word[i]);
        fuzzFreq.push(frequency[i]);

      }
      count++
      if(count == 40) break;
    }



  /*  for(i in fuzzWord)
    {
        for(z in fuzzWord) {

            var breakFuzz = fuzzWord[i].split("@");

            var val = fuzzWord[z].split("@");

            if(val.length > 1)
            {
                var match=0;
                    //console.log(fuzzWord[z]);

                    for(x in val)
                    {   
                       for(y in breakFuzz)
                       {   
                        if(breakFuzz[y] == val[x])
                        {

                            match = 1;
                            break;
                        }
                    }
                }
                if(match == 1) 
                {
                    if( (fuzzFreq[i] - fuzzFreq[z]) < 5)
                    {
                           // console.log("old index B" + fuzzFreq[z]);
                           fuzzFreq[z] = fuzzFreq[z] + Math.abs(fuzzFreq[i] - fuzzFreq[z]);
                          //  console.log(fuzzWord[i] + " " + fuzzWord[z] );
                          //  console.log("new index B" + fuzzFreq[z] + " \n\n" );
                          fuzzFreq[i] = Math.round(fuzzFreq[i] * 0.25);

                      }
                      else
                      {         
                           // console.log("old index S" + fuzzFreq[i]);
                           fuzzFreq[i] = fuzzFreq[i] + Math.abs(fuzzFreq[i] - fuzzFreq[z]);
                           // console.log(fuzzWord[i] + " " + fuzzWord[z] );
                           // console.log("new index S " + fuzzFreq[i] + " \n\n" );
                           fuzzFreq[z] = Math.round(fuzzFreq[z] * 0.25);

                       }
                   }

               }


           }
       }

       var swapped;
       do {
         swapped = false;
         for (var i=0; i < fuzzFreq.length-1; i++) {
            if (fuzzFreq[i] < fuzzFreq[i+1]) {
               var temp = fuzzFreq[i];
               fuzzFreq[i] = fuzzFreq[i+1];
               fuzzFreq[i+1] = temp;

               var temp2 = fuzzWord[i];
               fuzzWord[i] = fuzzWord[i+1];
               fuzzWord[i+1] = temp2;
               swapped = true;
           }
       }
     } while (swapped); */


     for(i in fuzzWord)
     {
      text= text.concat(fuzzWord[i] + " "); 
      ftext= ftext.concat(fuzzFreq[i] + " ");


    }


    new schema.trend({
      trend: text,
      frequency: ftext           
    }).save(function(err, doc){
     if(err) res.json(err);
   });

    var currentdate = new Date();  
    var datetime = "Trend Calculation: " + currentdate.getDate() + "/"
    + (currentdate.getMonth()+1)  + "/" 
    + currentdate.getFullYear() + " @ "  
    + currentdate.getHours() + ":"  
    + currentdate.getMinutes() + ":" 
    + currentdate.getSeconds();
    console.log(datetime);
  } 
});



}); 


cronJob.start();
};


exports.checkarticleschedule = function () {
  var cronJob = cron.job("0 */1 * * * *", function(){
    schema.article.find({pending:1}).where('hide').equals(0).where('language').equals('english').lean().exec(function (err, docs){ 
      var checked; var mistakes; var temp;
        //  console.log(docs.headline);
        for(i in docs)
        {
          var id = docs[i]._id;
          gingerbread(docs[i].mainsection, function (error, text, result, corrections) {
            checked = result;
            mistakes = corrections.length;
            if(mistakes >= 15) temp=0;
            else temp= 5-(mistakes/3);    

            schema.article.update({_id: id}, {
              pending:0,
              rate: temp
            }, function(err){
              if(err) console.log(err);
            });
          });  

        }
      });  
  });
  cronJob.start();
};


exports.userratingschedule = function () {
  var cronJob = cron.job("0 */30 * * * *", function(){
       // console.log("test");
       schema.member.find({}).lean().exec(function (err, docs){

         var memid = new Array();
         var memjoin = new Array();
         for(i in docs)
         {
          memid.push(JSON.stringify(docs[i]._id));
          memjoin.push(docs[i].joindate);
        }

        schema.article.find({}).lean().exec(function (err, arcs){
          if(err) console.log(err);
          else
          {
               // for(i in memid) console.log(memid[i]);
               for(z in memid)
               {


                if(arcs != undefined && (docs != undefined || docs != null))
                {

                  var today = new Date();
                  var oneDay = 24*60*60*1000;
                  var days = Math.round(Math.abs((memjoin[z].getTime() - today.getTime())/(oneDay)));
                  var rates=0;
                  var arcNumber =0;
                  for(i in arcs)
                  {
                    if(memid[z] == arcs[i].memberid)
                    {
                      rates= rates + (arcs[i].rate/arcs[i].count);
                      arcNumber++;
                    }
                  }

                  var x = arcNumber / days;
                  var y = ((-11/20)*(x-2)*(x-2)) + 5;
                  if(y < 0) y =0;

                  rates = (rates+y)/(arcNumber+1);
                   // console.log(memid[z] + " " + rates);
                   memid[z] = memid[z].replace(/['"]+/g, '');
                   schema.member.update({_id:memid[z]}, {
                    rate: rates
                  }, function(err){
                    if(err) console.log(err);
                       // else console.log("updated");
                     });
                 }

                    //ends here
                    
                  }
                }
              });
});


});
cronJob.start();
};




exports.articlerankingschedule = function () {
  var cronJob = cron.job("0 */5 * * * *", function(){


   var test = "test";
   var anchordata = new Array();
   var today = new Date();
   today.setDate(today.getDate());
   var limit = new Date();
   limit.setDate(limit.getDate() - 10);

   var oneDay = 24*60*60*1000;
   var data;
   schema.article.find({created: {"$lte": today, "$gte": limit}}).where('language').equals('english').where('pending').equals(0).where('hide').equals(0).lean().exec(function (err, arcinfo){

    data = arcinfo;
    schema.trend.find({}).sort({"created": -1}).limit(1).lean().exec(function (err, info){
      if(info[0] != undefined){
               // var trends = info[0].trend.replace(/[@\.]+/g, " ");
                //console.log(trends);
                var trends = info[0].trend.split(" ");
                schema.member.find({}).lean().exec(function (err, memdoc){

                  var meminfo = memdoc;

                  for (var i=0; i < data.length; i++)
                  {

                    for(k in meminfo)
                    {
                      if(meminfo[k]._id == data[i].memberid.replace(/['"]+/g, '')) 
                      {
                        data[i].urate= meminfo[k].rate;
                        break;
                      }
                    }

                    data[i].arate= data[i].rate/data[i].count;

                  // console.log(data[i]._id + " " + data[i].urate);
                  data[i].time = (10 - Math.round(Math.abs((data[i].created.getTime() - today.getTime())/(oneDay))));

                  var tags = data[i].tags.split(",");
                  var tagSum=0;

                  for(x in tags)
                  {

                    for(y in trends)
                    {
                            //console.log(tags[x].toLowerCase() + "  " + trends[y].toLowerCase());
                            var trendWords = trends[y].split('@');
                            for(z in trendWords)
                            {
                              if(z == trendWords.length) break;
                              //  console.log(data[i]._id + "  " + tags[x].toLowerCase() + "  " + trendWords[z].toLowerCase());
                              if(tags[x].toLowerCase() == trendWords[z].toLowerCase())
                              {

                              // console.log(data[i]._id + "  " + tags[x].toLowerCase() + "  " + trends[y].toLowerCase());
                              tagSum = tagSum + (info[0].frequency[y]/info[0].frequency[0]) + 1;
                              

                            }
                          }
                        }

                      } 

                      data[i].trend = tagSum;

              //console.log(data[i]['trend']);

            }

            var vectors = new Array();
            for (var i = 0 ; i < data.length ; i++)
              vectors[i] = [ data[i]['time'] , data[i]['arate'] , data[i]['urate'] , data[i]['trend']];


            kmeans.clusterize(vectors, {k: 3}, function(err,res) {
              if (err) console.error(err);
              else
              {
                var c1 = res[0].centroid;
                var c2 = res[1].centroid;
                var c3 = res[2].centroid;
                var mainCluster; var secondCluster; var thirdCluster;
                var c1val = c1[0]+c1[1]+c1[2]+c1[3];
                var c2val = c2[0]+c2[1]+c2[2]+c2[3];
                var c3val = c3[0]+c3[1]+c3[2]+c3[3];
                if( (c1val >= c2val) && (c2val >= c3val) )
                {
                  mainCluster = res[0];
                  secondCluster = res[1];
                }
                else if( (c1val >= c2val) && (c3val >= c2val))
                {
                 mainCluster = res[0];
                 secondCluster = res[2];
               }
               else if( (c2val >= c1val) && (c1val >= c3val))
               {
                 mainCluster = res[1];
                 secondCluster = res[0];
               }
               else if( (c2val >= c1val) && (c3val >= c1val))
               {
                 mainCluster = res[1];
                 secondCluster = res[2];
               }
               else if( (c3val >= c1val) && (c1val >= c2val))
               {
                 mainCluster = res[2];
                 secondCluster = res[0];
               }
               else
               {
                 mainCluster = res[2];
                 secondCluster = res[1];
               }

               console.log(res);
             /*  if(mainCluster.cluster.length < 4)
               {

               } */

              // console.log(mainCluster.cluster);
              for(z in data)
              {
                var value =0;
                for(m in mainCluster.clusterInd)
                {
                  if(z == mainCluster.clusterInd[m])
                  {
                    value= 1;
                    break;

                  }
                  for(n in secondCluster.clusterInd)
                  {
                   if(z == secondCluster.clusterInd[n])
                   {
                    value= 2;
                    break;
                  }
                }
                break;
              }
                 //   console.log(data[z]._id + " " + value)
                 schema.article.update({_id: data[z]._id},
                 {
                  ranking: value
                }, function(err, docs){
                  if(err) console.log(err);
                  //  else console.log("rank updated " + value );
                });

               }
             } 
           });
});

}
});

});
});
cronJob.start();
};


exports.timeseriesschedule = function () {
  var cronJob = cron.job("0 */45 * * * *", function(){

    schema.trend.find({}).sort({"created": -1}).lean().exec(function (err, list){

      var word = list[0].trend.split(" ");
      var freq = list[0].frequency.split(" ");
      var data = new Array();
      var a =new Array();
      //  console.log(word[0]);
      for(var j=48; j > 0; j--)
      {
        var oldWord = list[j].trend.split(" ");
        var oldFreq = list[j].frequency.split(" ");
        var flag=0;
        a.push(list[j].created);
        for(k in oldWord)
        {
          if(word[0] == oldWord[k])
          {

            a.push(parseInt(oldFreq[k]));

            flag=1;
          }
        }
        if(flag==0)
        {
         a.push(parseInt(0));
       } 

       data.push(a);
     }

     a.push(list[0].created);
     a.push(parseInt(freq[0]));
     data.push(a);
 /*  var t     = new timeseries.main(timeseries.adapter.fromDB(data, {
    date:   'date',     // Name of the property containing the Date (must be compatible with new Date(date) )
    value:  'freq'     // Name of the property containign the value. here we'll use the "close" price.
  })); */
var t     = new timeseries.main(data);

//console.log(t);
var processed = t.ma({
  period:    4
}).output();


//console.log("Moving Average")
//console.log(processed);

});  
}); 



cronJob.start();

};

function postrim(data)
{
 var words = new pos.Lexer().lex(data);
 var taggedWords = new pos.Tagger().tag(words);
 var test="";
 var word = new Array();
 var tag = new Array();

 for (i in taggedWords) {
  var taggedWord = taggedWords[i];
  word.push(taggedWord[0]);
  tag.push(taggedWord[1]);
}
for (var j=0; j < word.length; j++) {
  var bigWord ="";
  if((tag[j] =="NN" || tag[j] =="NNP" || tag[j] =="NNPS") && (word[j][0] === word[j][0].toUpperCase()))
  {
    if((j != word.length-1) &&  (tag[j+1] =="NN"  ||tag[j+1] =="NNP" || tag[j+1] =="NNPS"))
    {
      //  console.log(word[j] + word[j+1]);
      bigWord = word[j].concat("@" + word[j+1]);
      while(((j+1) != word.length-1) &&  (tag[j+2] =="NNP" || tag[j+2] =="NNPS"))
      {
       bigWord= bigWord.concat("@" + word[j+2]);
       j++;
     }
     test = test.concat(bigWord + " ");
     j++;
   }
   else if(((j-1) != -1) &&  (tag[j-1] =="NN"  ||tag[j-1] =="NNP" || tag[j-1] =="NNPS"))
   {
    //console.log(word[j-1] + word[j]);
    bigWord = word[j-1].concat("@" + word[j]);
    var p=j;
    while(((p-2) != -1) &&  (tag[p-2] =="NNP" || tag[p-2] =="NNPS"))
    {
      bigWord = word[p-2].concat("@" + bigWord);
      p--;
      j++;
    }
    test = test.concat(bigWord + " ");
  } 
  else 
  { 
    test = test.concat(word[j] + " ");
  }

} 
}



return test;

}

function scrap(site)
{
 var data ="";
 request(site, function (error, response, html) {
  if (!error && response.statusCode == 200) {

   var $ = cheerio.load(html);
   $('a').each(function(i, element){
    var a = $(this).text();
    data= data.concat(a + " ");
  });

   data = data.replace(/[^a-zA-Z\.]+/g, " ");
			/*var words = ['','px','News', 'Home', 'Bangladesh', 'Politics', 'Economy', 'World', 'Technology', 'Science', 'Environment', 'Health', 'Lifestyle', 'Entertainment', 'Bangla', 'Bangladesh', 'Stories',  'Privacy', 'Policy', 'Contact' ,'Advertisement' ,'apps' ,'Blog' ,'Mobile' ,'Media' ,'Image' ,'Video' ,'View','All'];
			var regex = new RegExp('\\b(' + words.join('|') + ')\\b', 'g');
			data = data.replace(regex, " ");*/
			data= data.replace(/\b(?:op|read|Sport|Sports|Tech|New|International|National|Dhaka|Business|News|Home|Bangladesh|Politics|Economy|World|Technology|Science|Environment|Health|Lifestyle|Entertainment|Bangla|Bangladesh|Stories|Privacy|Policy|Contact|Advertisement|apps|Blog|Mobile|Media|Image|Video|View|All)\b/ig, ' ');

           // console.log(data);
           data = postrim(data);
           schema.snapshot.find({name: site}).lean().exec(function (err, docs){
            if(err) res.json(err);
            else
            {
             if(docs[0]==null)
             {
              console.log("making new");
              new schema.snapshot({
               store: data,
               name: site            
             }).save(function(err, doc){
               if(err) res.json(err);
             });
           }
           else
           {
            schema.snapshot.update({name: site},
            {
             store: data
           }, function(err, docs){
             if(err) console.log(err);
           });
          }
        }
      });


         }
         else console.log(error);
       });
}


