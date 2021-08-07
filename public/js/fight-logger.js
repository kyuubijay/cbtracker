let subs = []
let subs1 = []
let txs = []
let fightInterval = 10 //seconds

const fightAddress = $('#fight-address')
const fightResult = $('#fight-result')



var log_headers = ['date', 'name', 'result', 'character', 'weapon', 'player_roll', 'enemy_roll', 'reward', 'xp', 'gas', 'gain']
var $table_accounts = $('#table-accounts-logger tbody')
var table_fight_logs = document.getElementById('table-fight-logs').tBodies[0]
var currCurrency = localStorage.getItem('currency')
var currencies = ['php', 'aed', 'ars', 'aud', 'brl', 'cny', 'eur', 'gbp', 'hkd', 'idr', 'jpy', 'myr', 'sgd', 'thb', 'twd', 'usd', 'vnd']
var bnbPrice = 0
var skillPrice = 0
var totalGain = 0
var totalGainLabel = document.getElementById('total_gain_label')
var fight_logs = []

async function priceTicker() {
    $.get(`https://api.coingecko.com/api/v3/simple/price?ids=cryptoblades,binancecoin&vs_currencies=${currencies.join(',')}`, (result) => {
        bnbPrice = result.binancecoin[currCurrency]
        skillPrice = result.cryptoblades[currCurrency]
    })
}

async function subscribe (address) {
    console.log('Subscribed:', address)
    subs[address] = setInterval(async() => {
        try {
            const latestBlock = await getLatestBlock()
            console.log('encoded', web3.eth.abi.encodeParameter('address', address))
            const results = await getPastEvents('FightOutcome',   
                latestBlock.number-5,        
                latestBlock.number,
                '0x39bea96e13453ed52a734b6aceed4c41f57b2271',
                ['0x7a58aac6530017822bf3210fccef7efa31f56277f19966bc887bfb11f40ca96d',
                web3.eth.abi.encodeParameter('address', address)]
                );

            const forgeResults = await getPastEvents('Reforged',   
                latestBlock.number-5,        
                latestBlock.number,
                '0x39bea96e13453ed52a734b6aceed4c41f57b2271',
                ['0xd1b1d9a936fc3409b20503a5fd66b94b1c2a8b4986d01def5b9ef60272896e3c',
                web3.eth.abi.encodeParameter('address', address)]
                );

            console.log('forgeResults', forgeResults)
            if (results.length > 0) {
                results.forEach(async result => {
                    if (!txs.includes(result.transactionHash)) {
                        const {character, enemyRoll, playerRoll, owner, skillGain, xpGain, weapon} = result.returnValues
                        const tx = await getTransaction(result.transactionHash)
                        const receipt = await getTransactionReceipt(result.transactionHash)
                        const gasCost = tx.gasPrice * receipt.gasUsed
                        const name = subs1[owner]
                        fightResult.append(`${name},${(parseInt(playerRoll) > parseInt(enemyRoll) ? 'Win' : 'Lost')},${character},${weapon},${playerRoll},${enemyRoll},${web3.utils.fromWei(BigInt(skillGain).toString(), 'ether')},${xpGain},${web3.utils.fromWei(BigInt(gasCost).toString(), 'ether')}\n`)
                        row1 = table_fight_logs.insertRow()
                        // row1.insertCell(0).innerHTML = 
                        // row1.insertCell(1).innerHTML = name
                        // row1.insertCell(2).innerHTML = 
                        // row1.insertCell(3).innerHTML = character
                        // row1.insertCell(4).innerHTML = weapon
                        // row1.insertCell(5).innerHTML = playerRoll
                        // row1.insertCell(6).innerHTML = enemyRoll
                        // row1.insertCell(7).innerHTML = `${web3.utils.fromWei(BigInt(skillGain).toString(), 'ether')}`
                        // row1.insertCell(8).innerHTML = xpGain

                        reward = `${web3.utils.fromWei(BigInt(skillGain).toString(), 'ether')}`
                        gas = parseFloat(`${web3.utils.fromWei(BigInt(gasCost).toString(), 'ether')}`)
                        gain = (parseFloat(reward) * skillPrice) - (gas * bnbPrice)
                        totalGain += gain
                        
                        fight_log = {}
                        fight_log.id = fight_logs.length
                        fight_log.date = new Date().toLocaleString('en-US', {hour12: false, month:'numeric',day:'numeric',year:'numeric', hour: "numeric", minute: "numeric"}).replace(',','')
                        fight_log.name = name
                        fight_log.result = `${(parseInt(playerRoll) > parseInt(enemyRoll) ? 'Win' : 'Lost')}`
                        fight_log.character = character
                        fight_log.weapon = weapon
                        fight_log.player_roll = playerRoll
                        fight_log.enemy_roll = enemyRoll
                        fight_log.reward = `${truncateToDecimals(reward, 6)}`
                        fight_log.xp = xpGain
                        fight_log.gas = `${(gas * parseFloat(bnbPrice)).toLocaleString('en-US', { style: 'currency', currency: currCurrency.toUpperCase() })}`
                        fight_log.gain = gain.toLocaleString('en-US', { style: 'currency', currency: currCurrency.toUpperCase() })
                        counter = 0
                        for(var f in log_headers) {
                            if (fight_log.hasOwnProperty(log_headers[f])) {
                                row1.insertCell(counter).innerHTML = fight_log[log_headers[f]]
                                counter+=1
                            }

                        }
                        
                        totalGainLabel.innerHTML = ('Total gain: ' + totalGain).toLocaleString('en-US', { style: 'currency', currency: currCurrency.toUpperCase() })

                        txs.push(result.transactionHash)
                        console.log(result.transactionHash)
                    }
                })
            }
        }catch(e) {
            console.log(e)
        }
    }, fightInterval * 1000)
}

async function refresh () {
    loadData()
}

async function addAccount() {
    // console.log(`${(parseFloat(`${web3.utils.fromWei(BigInt(0.000342).toString(), 'ether')}`) * parseFloat(bnbPrice)).toLocaleString('en-US', { style: 'currency', currency: currCurrency.toUpperCase() })}`)
    var address = $('#logger-address').val().trim()
    var name = $('#logger-name').val().trim()
    if (!Object.keys(subs).includes(address) && isAddress(address)) {
        await subscribe(address)        
        fightAddress.append(`${address}\n`)
        subs1[address] = name
        $('#modal-add-account').modal('hide')
        refresh()
    }
}

function exportList() {
    if (Object.keys(subs1).length > 0) {
        var textToSave = JSON.stringify(Object.assign({}, subs1))
        console.log('textToSave', textToSave)
        var textToSaveAsBlob = new Blob([textToSave], {
            type: "application/json"
        });
        var textToSaveAsURL = window.URL.createObjectURL(textToSaveAsBlob);
        var downloadLink = document.createElement("a");
        downloadLink.download = `CBTracker-Address-List-${new Date().getTime()}.json`;
        downloadLink.innerHTML = "Download File";
        downloadLink.href = textToSaveAsURL;
        downloadLink.onclick = function () {
            document.body.removeChild(event.target);
        };
        downloadLink.style.display = "none";
        document.body.appendChild(downloadLink);
        downloadLink.click();
    }
}

function exportLogs() {

    // var t = document.getElementById('table-accounts-logger').tableToJSON()
    // console.log(t)

    // const jsonTables = HtmlTableToJson.parse(document.getElementById('table-accounts-logger'))
    // console.log(jsonTables)

    // var list = fightResult.val().split('\n')
    // list.splice(list.length-1, 1)
    // if (list.length > 0) {
    //     var textToSave = list.join('\n')
    //     var textToSaveAsBlob = new Blob([textToSave], {
    //         type: "application/json"
    //     });
    //     var textToSaveAsURL = window.URL.createObjectURL(textToSaveAsBlob);
    //     var downloadLink = document.createElement("a");
    //     downloadLink.download = `CBTracker-Fight-Logs-${new Date().getTime()}.txt`;
    //     downloadLink.innerHTML = "Download File";
    //     downloadLink.href = textToSaveAsURL;
    //     downloadLink.onclick = function () {
    //         document.body.removeChild(event.target);
    //     };
    //     downloadLink.style.display = "none";
    //     document.body.appendChild(downloadLink);
    //     downloadLink.click();
    // }
}

async function importList() {
    if (!window.File || !window.FileReader || !window.FileList || !window.Blob) {
        return alert('The File APIs are not fully supported in this browser.');
    }

    var input = document.getElementById('file-import');
    if (!input) {
        return alert("Um, couldn't find the fileinput element.");
    }
    if (!input.files) {
        return alert("This browser doesn't seem to support the `files` property of file inputs.");
    }
    if (!input.files[0]) {
        return alert("Please select a file before clicking 'Import'");
    }
    var fileType = input.files[0].type
    if (fileType === 'application/json') {
        var file = input.files[0];
        var fr = new FileReader();
        fr.readAsText(file);
        fr.addEventListener('load', function () {
            var { accounts, currency, hideAddress, names } = JSON.parse(fr.result)
            subs1 = Object.assign([], JSON.parse(names))
            if(Object.keys(subs1).length > 0) {
                Object.keys(subs1).forEach( async address => {
                    if (!Object.keys(subs).includes(address) && isAddress(address)) {
                        await subscribe(address)
                    }
                })
                // for(var k in subs1) {
                //     if (!Object.keys(subs).includes(k) && isAddress(k)) {
                //         await subscribe(k)        
                //         fightAddress.append(`${address}\n`)
                //         // $('#modal-add-account').modal('hide')
                        
                //         // refresh()
                //     }
                // }
            }
            
            
            refresh()
            $('#modal-import').modal('hide')
        });
    } else alert("Please import a valid json file");
}

function copy_address_to_clipboard() {
    navigator.clipboard.writeText('0x2548696795a3bCd6A8fAe7602fc26DD95A612574').then(n => alert("Copied Address"),e => alert("Fail\n" + e));
}


window.addEventListener('beforeunload', function (e) {
    if (fightResult.val()) {
        e.preventDefault();
        e.returnValue = 'Your fight logs will be lost. Please save them before closing/refreshing this page';
    }
});

$('#modal-add-account').on('shown.bs.modal', function (e) {
    $('#logger-address').val('')
});

window.addEventListener('beforeunload', function (e) {
    if (fightResult.val()) {
        e.preventDefault();
        e.returnValue = 'Your fight logs will be lost. Please save them before closing/refreshing this page';
    }
});

async function loadData() {
    $table_accounts.html(getHtml());
}

function getHtml() {
    let tHtml = ''
    for(var k in subs1) {
        tHtml += `<tr class="text-white align-middle"><td>${subs1[k]}</td><td>${k}</td></tr>`
    }
    return tHtml
}

function populateCurrency() {
    $('#select-currency').html('');
    $("#select-currency").append(new Option(currCurrency.toUpperCase(), currCurrency));
    currencies.forEach(curr => {
        if (currCurrency !== curr) {
            $("#select-currency").append(new Option(curr.toUpperCase(), curr));
        }
    })
}

$("#select-currency").on('change', (e) => {
    currCurrency = e.currentTarget.value
    localStorage.setItem('currency', currCurrency)
    populateCurrency()
    refresh()
})

$('document').ready(async () => {
    priceTicker()
    setInterval(() => {
        priceTicker()
    }, 30000)
    loadData()
})
