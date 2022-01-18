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
document.getElementById('ajaxsrwrap').insertAdjacentHTML('beforeend', `<div id="scores">Loading...</div>`);
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

console.log(`Processing ${counter} properties`)
async function a(){
    await Promise.allSettled(promises)
        .then((promises)=>{
            let tableElementStyle="border: 1px solid grey; padding: 4px";
            let tableRows = [`
                <tr">
                    <th style="${tableElementStyle}">Name</th>
                    <th style="${tableElementStyle}">Total</th>
                    <th style="${tableElementStyle}">Free WiFi</th>
                    <th style="${tableElementStyle}">Cleanliness</th>
                    <th style="${tableElementStyle}">Comfort</th>
                    <th style="${tableElementStyle}">Facilities</th>
                    <th style="${tableElementStyle}">Location</th>
                    <th style="${tableElementStyle}">Value for money</th>
                </tr>`]
            for (const promise of promises) {
                if (promise.status !== 'fulfilled') {
                    console.error("There were problems fetching scores")
                }
                let property = promise.value
                tableRows.push(`<tr style="${tableElementStyle}">
                    <td style="${tableElementStyle}">${property.name}</td>
                    <td style="${tableElementStyle}">${property.score["Total"]}</td>
                    <td style="${tableElementStyle}">${property.score["Free WiFi"]===undefined?'MISSING':property.score["Free WiFi"]}</td>
                    <td style="${tableElementStyle}">${property.score["Cleanliness"]}</td>
                    <td style="${tableElementStyle}">${property.score["Comfort"]}</td>
                    <td style="${tableElementStyle}">${property.score["Facilities"]}</td>
                    <td style="${tableElementStyle}">${property.score["Location"]}</td>
                    <td style="${tableElementStyle}">${property.score["Value for money"]}</td>
                </tr>`)
            }
            let result = `<table>${tableRows.join("")}</table>`;
            document.getElementById('scores').innerHTML = result
        })
}
a()