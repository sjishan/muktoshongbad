var pos = require('pos');

exports.generatedTags = function (headline,body)
{
	var words = new pos.Lexer().lex(body);
	var taggedWords = new pos.Tagger().tag(words);
	var nouns= new Array();
	var frequency = new Array();
	nouns.push("#");

	for (i in taggedWords) {
		var taggedWord = taggedWords[i];
		var word = taggedWord[0];
		var tag = taggedWord[1];
		if(tag =="NN" || tag =="NNP" || tag =="NNPS" || tag =="NNS")
		{
			var flag=0
			for (j in nouns)
			{
				if(nouns[j] == word)
				{
					if(isNaN(frequency[j])) frequency[j]=0;
					frequency[j]++;
					if(tag=="NNP" || tag=="NNPS" ) frequency[j]++;
					flag=1;
				} 
			}
			if(flag==0)
			{ 
				nouns.push(word);
				if(tag=="NNP" || tag=="NNPS" )
				{ 
					frequency.push(2);
				}
				else
				{
					frequency.push(1);
				} 
			}
		}
	}

	words = new pos.Lexer().lex(headline);
	taggedWords = new pos.Tagger().tag(words);

	for (i in taggedWords){

		var taggedWord = taggedWords[i];
		var word = taggedWord[0];
		for(j in nouns)
		{

			if(word== nouns[j])
			{
				frequency[j]*=2;
			}
           // console.log(word);
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

   			var temp2 = nouns[i];
   			nouns[i] = nouns[i+1];
   			nouns[i+1] = temp2;
   			swapped = true;
   		}
   	}
   } while (swapped); 
   var tags="";
   for(var i=0; i < 5; i++)
   {
   	if(nouns[i].length <= 1) continue;

   	if(i ==4) tags= tags.concat(nouns[i]);
   	else tags= tags.concat(nouns[i]+",");
   //console.log(nouns[i] + " ");
}
//console.log(tags);
return tags; 
};




exports.relatedArticles = function (articles) {

	var point = [];
	var data =[];
	for(i in articles)
	{
		data[i]=[];
		data[i][0]="";
		data[i][1]="";
		data[i][2]="";

		point[i] = [];
		point[i][0] = 0;
		point[i][1] = articles[i]._id;
		point[i][2] = articles[i].headline;
		point[i][3] = articles[i].primaryimage;
	}
	
	for(var i=0; i < articles.length; i++)
	{
		
		var ptags = articles[i].tags.split(",");
		
		for(var j=0; j< articles.length; j++)
		{
			
			if(i==j) continue;
			//console.log(articles[i].tags + "-->" + articles[j].tags + "-->");
			var tags = articles[j].tags.split(",");
			for(var k=0; k < ptags.length; k++)
			{
				for(var l=0; l < tags.length; l++)
				{
					if(ptags[k].toLowerCase()==tags[l].toLowerCase()) point[j][0]++;
				}
			}

		}

		
		var swapped;
		do {
			swapped = 0;
			for (var z=0; z < articles.length-1; z++) {
				if (point[z][0] < point[z+1][0]) {

					var temp = point[z][0];
					point[z][0] = point[z+1][0];
					point[z+1][0] = temp;

					temp = point[z][1];
					point[z][1] = point[z+1][1];
					point[z+1][1] = temp;

					temp = point[z][2];
					point[z][2] = point[z+1][2];
					point[z+1][2] = temp;

					temp = point[z][3];
					point[z][3] = point[z+1][3];
					point[z+1][3] = temp;	

					swapped = 1;
				}
			}
		} while (swapped);
		
		for(o in articles)
		{
			//console.log(data[i][1] + "\n");
			if(point[o][0] ==0) continue;
			else if(o == 5) break;
			else
			{
				data[i][0] = data[i][0].concat(point[o][1]+"~");
				data[i][1] = data[i][1].concat(point[o][2]+"~");
				data[i][2] = data[i][2].concat(point[o][3]+"~");

			}
		}

		/*console.log(articles[i].tags+"->");
		for(jj in articles)
		{
			console.log(point[jj][4] + " " + point[jj][0] + "\n");
		}
		console.log("\n"); */
		//console.log(articles[i].headline + "-->" + data[i][1]);
		//console.log("\n");
		for(m in articles)
		{
			point[m][0] = 0;
			point[m][1] = articles[m]._id;
			point[m][2] = articles[m].headline;
			point[m][3] = articles[m].primaryimage;
		}
		//console.log("\n");

	}

	return data;
};