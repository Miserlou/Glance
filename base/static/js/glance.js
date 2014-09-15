var currentSlug = '';
var currentId = '';

function getURL(url, callback) {
    var xmlhttp = new XMLHttpRequest();

    xmlhttp.onreadystatechange = function() {
        if (xmlhttp.readyState == 4 && xmlhttp.status == 200) {
            callback(xmlhttp.responseText);
        }
    }

    xmlhttp.open("GET", url, true);
    xmlhttp.send();
}

// function hide_glance(){
//     document.getElementById("glance_spacer").style.display = "none";
//     document.getElementById("glance_container").style.display = "none";
//     document.getElementById("glance_holder").style.display = "none";
// }

document.getElementById("glance_selector").addEventListener("change", function(e) {
    clearTimeouts();
    localStorage.setItem('WPM', document.getElementById("glance_selector").value);
    glance();
});

// Entry point to the beef.
// Gets the WPM and the selected text, if any.
function glance(){

    var wpm = parseInt(document.getElementById("glance_selector").value, 10);
    if(wpm < 1){
        return;
    }

    glanceifyURL();
}

// The meat!
function glanceify(input, url){

    var wpm = parseInt(document.getElementById("glance_selector").value, 10);
    var ms_per_word = 60000/wpm;

    // Split on any spaces.
    var all_words = input.split(/\s+/);

    // The reader won't stop if the selection starts or ends with spaces
    if (all_words[0] == "")
    {
        all_words = all_words.slice(1, all_words.length);
    }

    if (all_words[all_words.length - 1] == "")
    {
        all_words = all_words.slice(0, all_words.length - 1);
    }

    var word = '';
    var result = '';

    // Preprocess words
    var temp_words = all_words.slice(0); // copy Array
    var t = 0;

    for (var i=0; i<all_words.length; i++){

        if(all_words[i].indexOf('.') != -1){
            temp_words[t] = all_words[i].replace('.', '&#8226;');
        }

        // Double up on long words and words with commas.
        if((all_words[i].indexOf(',') != -1 || all_words[i].indexOf(':') != -1 || all_words[i].indexOf('-') != -1 || all_words[i].indexOf('(') != -1|| all_words[i].length > 8) && all_words[i].indexOf('.') == -1){
            temp_words.splice(t+1, 0, all_words[i]);
            temp_words.splice(t+1, 0, all_words[i]);
            t++;
            t++;
        }

        // Add an additional space after punctuation.
        if(all_words[i].indexOf('.') != -1 || all_words[i].indexOf('!') != -1 || all_words[i].indexOf('?') != -1 || all_words[i].indexOf(':') != -1 || all_words[i].indexOf(';') != -1|| all_words[i].indexOf(')') != -1){
            temp_words.splice(t+1, 0, " ");
            temp_words.splice(t+1, 0, " ");
            temp_words.splice(t+1, 0, " ");
            t++;
            t++;
            t++;
        }
        t++;
    }

    all_words = temp_words.slice(0);

    var currentWord = 0;
    var running = true;
    var glance_timers = new Array();

    document.getElementById('glance_result-' + currentId).addEventListener("click", function() {
        pausePlay();
    });

    function pausePlay(){
        if(running) {
            stopglance();
        } else {
            startglance();
        }
    }

    function updateValues(i) {

        var p = pivot(all_words[i]);
        document.getElementById("glance_result-" + currentId).innerHTML = p;
        currentWord = i;

    }

    function startglance() {

        document.getElementById("glance_toggle").style.display = "block";
        document.getElementById("glance_toggle").textContent = "Pause";

        running = true;

        glance_timers.push(setInterval(function() {
            updateValues(currentWord);
            currentWord++;
            if(currentWord >= all_words.length) {
                currentWord = 0;
                stopglance();
            }
        }, ms_per_word));
    }

    function stopglance() {
        for(var i = 0; i < glance_timers.length; i++) {
            clearTimeout(glance_timers[i]);
        }

        document.getElementById("glance_toggle").textContent = "Play";
        running = false;
    }

    startglance();
}

// Find the red-character of the current word.
function pivot(word){
    var length = word.length;

    var bestLetter = 1;
    switch (length) {
        case 1:
            bestLetter = 1; // first
            break;
        case 2:
        case 3:
        case 4:
        case 5:
            bestLetter = 2; // second
            break;
        case 6:
        case 7:
        case 8:
        case 9:
            bestLetter = 3; // third
            break;
        case 10:
        case 11:
        case 12:
        case 13:
            bestLetter = 4; // fourth
            break;
        default:
            bestLetter = 4; // fifth
    };

    word = decodeEntities(word);
    var start = '.'.repeat((4-bestLetter)) + word.slice(0, bestLetter-1).replace('.', '&#8226;');
    var middle = word.slice(bestLetter-1,bestLetter).replace('.', '&#8226;');
    var end = word.slice(bestLetter, length).replace('.', '&#8226;') + '.'.repeat((4-(word.length-bestLetter)));

    var result;
    result = "<span class='glance_start'>" + start;
    result = result + "</span><span class='glance_pivot'>";
    result = result + middle;
    result = result + "</span><span class='glance_end'>";
    result = result + end;
    result = result + "</span>";

    result = result.replace(/\./g, "<span class='invisible'>.</span>");

    return result;
}


// Uses the Readability API to get the juicy content of the current page.
function glanceifyURL(url, id){

    clearTimeouts();
    currentSlug = convertToSlug(url);
    currentId = id;

    $('#glance_result-' + currentId + '-holder').show();
    $('#' + currentId).html('Loading..');
    $('#' + currentId).hide();

    var diffbot_token = '2efef432c72b5a923408e04353c39a7c';

    //getURL("https://www.readability.com/api/content/v1/parser?url="+ encodeURIComponent(url) +"&token=" + readability_token +"&callback=?",
    getURL("https://api.diffbot.com/v2/article?url="+ encodeURIComponent(url) +"&token=" + diffbot_token, // +"&callback=?",
        function(data) {

            data = JSON.parse(data);

            if(data.error){
                document.getElementById("glance_result").innerText = "Article extraction failed. Try selecting text instead.";
                return;
            }

            createOrUpdate(url, data.title);

            var title = '';
            if(data.title !== ""){
                title = data.title + ". ";
            }

            var author = '';
            if(data.author !== undefined){
                author = "By " + data.author + ". ";
            }

            var body = data.text;
            body = body.trim(); // Trim trailing and leading whitespace.
            body = body.replace(/\s+/g, ' '); // Shrink long whitespaces.

            var intro = "Article starting in Five. Four. Three. Two. One. ";
            var text_content = intro + title + author + body;
            text_content = text_content.replace(/\./g, '. '); // Make sure punctuation is apprpriately spaced.
            text_content = text_content.replace(/\?/g, '? ');
            text_content = text_content.replace(/\!/g, '! ');
            glanceify(text_content, url);
        });
}

//////
// Helpers
//////

// This is a hack using the fact that browers sequentially id the timers.
function clearTimeouts(){
    var id = window.setTimeout(function() {}, 0);

    while (id--) {
        window.clearTimeout(id);
    }
}

// Let strings repeat themselves,
// because JavaScript isn't as awesome as Python.
String.prototype.repeat = function( num ){
    if(num < 1){
        return new Array( Math.abs(num) + 1 ).join( this );
    }
    return new Array( num + 1 ).join( this );
};

function decodeEntities(s){
    var str, temp= document.createElement('p');
    temp.innerHTML= s;
    str= temp.textContent || temp.innerText;
    temp=null;
    return str;
}
