async function extractScore(url) {
    const resp = await fetch(url);
    const text = await resp.text()
    var parser = new DOMParser();
    var doc = parser.parseFromString(text, "text/html");

    let score = {}
    //Overall score
    let review_score = doc.getElementsByClassName('featured_review_score')
    let attribute = review_score[0].getAttribute('data-review-score');
    score['Overall'] = parseFloat(attribute)

    //Score breakdown
    var element = doc.getElementById('review_list_score_breakdown')

    for (const child of element.children) {
        name = ''
        value = 0
        for (const c of child.children) {
            if (c.className === 'review_score_name') {
                name = c.innerHTML
            }
            if (c.className === 'review_score_value') {
                value = parseFloat(c.innerHTML)
            }
        }
        score[name] = value
    }
    return score;
}

function extractName(a) {
    return a.children[0].alt
}

function missingWifiScore(property) {
    return !('Free WiFi' in property.score);
}

function wifiScoreLessThan(property, n) {
    return property.score['Free WiFi'] < n;
}

function wifiScoreLessThanOverallBy(property, n) {
    return property.score['Free WiFi'] + n < property.score.Overall;
}

// Returns a csv from an array of objects with
// values separated by tabs and rows separated by newlines
function CSV(array) {
    // Use first element to choose the keys and the order
    var keys = Object.keys(array[0]);

    // Build header
    var result = keys.join("\t") + "\n";

    // Add the rows
    array.forEach(function(obj){
        result += keys.map(k => obj[k]).join("\t") + "\n";
    });

    return result;
}

let anchors = document.getElementsByTagName('a');
let counter = 0
promises = []
for (let i = 0, l = anchors.length; i < l; i++) {
    let a = anchors[i]
    let url = String(anchors[i]);
    if (url.includes('hotel/hr') && a.children[0].alt != null){
        counter++
        promises.push(async function extractScoreFromUrl() {
            return {
                name: extractName(a),
                score: await extractScore(url)
            }
        }())
    }
}

document.getElementById('ajaxsrwrap').insertAdjacentHTML('beforeend', `<div id="scores">Loading...</div>`);
console.log(`Processing ${counter} properties`)
async function a(){
    await Promise.allSettled(promises)
        .then((promises)=>{
            let propertiesToPrint=[]
            for (const promise of promises) {
                if (promise.status!=='fulfilled'){
                    console.error("There were problems fetching scores")
                }
                let property = promise.value
                let result = []
                result.push({name: 'Missing WiFi score', value: missingWifiScore(property)})
                result.push({name: 'WiFi score less than 8.0', value: wifiScoreLessThan(property, 8)})
                result.push({
                    name: 'WiFi score less than overall score by more than 0.5',
                    value: wifiScoreLessThanOverallBy(property, 0.5)
                })
                property.result = result
                let anyMatch = result.reduce(function (res, it) {
                    return res || it.value
                }, false);
                if (anyMatch) {
                    propertiesToPrint.push(property)
                }
            }
            document.getElementById('scores').innerHTML = `${JSON.stringify(propertiesToPrint)}`
        })
}
a()