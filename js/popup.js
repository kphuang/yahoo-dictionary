let lock = false;

// 'hello world' -> 'hello+world' 
function toQuery(input)
{
    trimmed = input.trim();
    wordList = trimmed.split(' ');
    return wordList.join('+');
}

function removeNodeById(id)
{
    let node = document.getElementById(id);
    if (node !== null)
    {
        node.remove(); 
        console.log(`${id} node is removed.`);
    }
}

async function searchForWords(query)
{
    let response = await fetch(query);
    if (!response.ok)
        throw new Error(`伺服器回應錯誤，錯誤碼：${response.status}，訊息：${response.statusText}。`);
    return await response.text();
}

function getSource(input)
{
    // live/f: female live/m: male
    let url = 'https://s.yimg.com/bg/dict/dreye/live';
    let src = '';

    let sound = new Audio(`${url}/f/${input}.mp3`);
    sound.muted = true;
    sound.preload = 'none';
    sound.play().then(_ => {
        src = `${url}/f/${input}.mp3`;
        console.log('promise f', src);
    }).catch(error => {
        console.log(error);
    });

    sound = new Audio(`${url}/m/${input}.mp3`);
    sound.muted = true;
    sound.preload = 'none';
    sound.play().then(_ => {
        src = `${url}/m/${input}.mp3`;
        console.log('promise m', src);
    }).catch(error => {
        console.log(error);
    });

    return src;
}

// <audio controls src="https://s.yimg.com/bg/dict/dreye/live/[f|m]/[input].mp3" preload="none"></audio>
function createAudio(input)
{
    let src = getSource(input);
    if (src === '')
        return null;

    let e = document.createElement('audio');
    e.id = 'audio';
    e.type = 'audio/mpeg';
    e.preload = 'none';
    e.controls = true;
    e.src = src;
    return e;
}

// If there is pronunciation element, there is probably audio.
function getPronunciation(doc)
{
    const hasAudio = 'compText mr-10 d-ib';
    const hasPhonetic = 'compList d-ib';

    let elements = doc.getElementsByClassName(hasAudio);
    if (elements.length === 0)
    {
        console.log('No possible audio element found');
        return null;
    }

    let classList = hasAudio.split(' ');
    let audio = [];
    for (let i = 0; i < elements.length; i++)
    {
        if (elements[i].classList[0] == classList[0] &&
            elements[i].classList[1] == classList[1] &&
            elements[i].classList[2] == classList[2])
            audio.push(elements[i]);
    }

    if (audio.length === 0)
    {
        console.log('Audio element not found');
        return null;
    }

    elements = doc.getElementsByClassName(hasPhonetic);
    if (elements.length === 0)
    {
        console.log('Phonetic not found');
        return null;
    }
    
    return audio[0];
}

function getBriefResult(doc)
{
    const cardFound = "dd cardDesign dictionaryWordCard sys_dict_word_card";
    const cardNotFound = "dd cardDesign pt-25 pb-25 pl-120 pr-120 sys_dict_zrp";

    let cards = doc.getElementsByClassName(cardFound);

    if (cards.length === 0)
    {
        cards = doc.getElementsByClassName(cardNotFound);
        if (cards.length === 0)
            throw new Error('例外錯誤：找不到無搜尋結果的HTML碼');
        return cards[0];
    }

    return cards;
}

function createParagraph(id, html)
{
    let e = document.createElement('p');
    if (id !== '')
        e.id = id;
    e.innerHTML = html;
    return e;
}

function createDiv(id, element)
{
    let e = document.createElement('div');
    e.id = id;
    if (element !== null)
        e.appendChild(element);
    return e;
}

function createLink(id, href, text)
{
    let e = document.createElement('a');
    e.href = href;
    e.target = '_blank';
    e.innerHTML = text;
    return e;
}

/*
<body>
<div id="tip/wait/result" ...>
<!-- tip, wait or query result -->
</div>
<footer ...>...</footer>
</body>
*/
function insertBeforeFooter(node)
{
    let body = document.getElementById('body');
    let indexFooter = body.childNodes.length - 2;
    body.insertBefore(node, body.childNodes[indexFooter]);
}

search.onclick = async function(element) {
    const waitMsg = '查詢中請稍候...';

    // Simple lock to avoid multiple click events at nearly the same time
    if (lock === true)
        return;
    lock = true;

    do // Acts like goto, to unlock if there is any failure.
    {
        let input = document.getElementById('input');

        // Just in case, this should not occur.
        if (input === null)
        {
            console.log('Input is null, exit.');
            break;
        }

        if (input.value === '')
        {
            console.log('Input is empty, exit.');
            break;
        }

        removeNodeById('tip');
        removeNodeById('result');
        insertBeforeFooter(createDiv('wait', createParagraph('', waitMsg)));

        let query = `https://tw.dictionary.search.yahoo.com/search?p=${toQuery(input.value)}`;
        let result = createDiv('result', null);

        try
        {
            let data = await searchForWords(query);
            let doc = (new DOMParser()).parseFromString(data, 'text/html');

            let brief = getBriefResult(doc);
            for (let i = 0; i < brief.length; i++)
                result.appendChild(brief[i]);    

            let pronunciation = getPronunciation(result);
            if (pronunciation !== null)
            {
                let audio = createAudio(input.value);
                if (audio !== null)
                    pronunciation.appendChild(audio);
            }

            result.appendChild(createLink('explication', query, '詳細釋義'));
            result.appendChild(document.createElement('br'));
            result.appendChild(document.createElement('br'));
        }
        catch (error)
        {
            result.appendChild(createParagraph('exception', error.message));
            break;
        }

        removeNodeById('wait');
        insertBeforeFooter(result);        
    }
    while(0);

    lock = false;
}

let onKeyUp = function(event) {
    const keyEnter = 13;

    if (event.keyCode === keyEnter)
    {
        event.preventDefault();
        document.getElementById('search').click();
    }
};

input.addEventListener('keyup', onKeyUp);
