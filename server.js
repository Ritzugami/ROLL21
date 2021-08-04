const express = require(`express`)
const cookieParser = require(`cookie-parser`)
const bp = require(`body-parser`)
const app = express();
const {Image, createCanvas} = require(`canvas`)
app.use(cookieParser())
app.use(express.json({
    limit: `200mb`
}))
const fetch = require(`node-fetch`);
const fs = require(`fs`)

//launch.
const server = app.listen(3030, `192.168.50.219`, () => {
    
    const port = server.address().port;
    console.log(`app listening at http://localhost:${port}`);
  });
const { Server } = require(`socket.io`);
const io = new Server(server)



//Create arrays for active players, entities, and the map fog



///////TODO////////////////////////////////////////////////////////////////////////////////////////////////////
/*
Add HUD for all party members and their healths
Add easy file upload system




*/


var currentHostAID = ``
var currentGID = ``;
var currentImgBuffer;
var currentGameInfo;


//create a session token.
var genStr = `ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789`;
var sessionToken = ``
for(var tokenCon = 0; tokenCon<128;tokenCon++)
{
    sessionToken += genStr[Math.floor(Math.random()*genStr.length)]
}
console.log(sessionToken)


//socket controllers.
io.on(`connection`, (socket) => {
    console.log(`somebody is here...`)
    socket.on(`disconnect`, ()=> {
        console.log(`somebody left!`)
    })

    //handler for all text commands:
    socket.on(`CLIInput`, (c) => {
        console.log(`somone sent a message: ${c}`)
        appendToTextArea(c);
    })

    socket.on(`dmjoin`, ()=> {
        console.log(`The DM has joined! Sending data to the DM...`)
        socket.emit(`dmInit`,{imgBuffer: currentImgBuffer, gameInfo: currentGameInfo})
    })
})

let appendToTextArea = (c) => {
    console.log(`appending to text area...`)
    io.emit(`appendToTextArea`, c)
}


io.on(`CLIInput`, () => {
    console.log(`somone sent a message...`)
})


//the homepage.
app.get(`/`,(req,res) => {
    res.redirect(`/login`)
})

//allow users to login.
app.get(`/login`,(req,res) => {
    res.sendFile(__dirname+`\\data\\html\\login.html`)
})
//allow users to create an account.
app.get(`/createanaccount`,(req,res) => {
    res.sendFile(__dirname+`\\data\\html\\createAnAccount.html`)
})

app.get(`/checklogin`,async (req,res) => {
    console.log(`login attempted.`)
    var un = req.query.un
    var pw = req.query.pw
    var accts = [];
    //access each account.
    await new Promise((rs,rj) => {
        console.log(__dirname + `\\data\\accounts`)
        fs.readdir(__dirname + `\\data\\accounts`, (err,files) => {
            accts = files.slice()
            rs()
        })
        
    })
    //remove ,json filetype from strings.
    /*
    for(var i =0;i<accts.length;i++)
    {
        accts[i] = accts[i].replace(/_.{16}\.json/g,``)
    }
    */

    //check if there's a matching acct. If so, login. if not, redirect to login screen.
    var acctFound = false;
    var checkedAll = false;
    var loginSuccess = false;
    var acctInfo;
    var i = 0;
    //check login. This is rudimentary and temporary.
    var regCheck = `${un}_.{16}\.json`
    while(!acctFound && !checkedAll)
    {
        //all accounts are of format accountName_accountID.json, so check accordingly
        var checkStr = null;
        if(accts[i] && accts[i].match(regCheck)) var checkStr = accts[i].match(regCheck)[0]
        console.log(checkStr)
        if(accts[i]===checkStr)
        {
            acctFound = true
            await new Promise((rs,rj) => {
                fs.readFile(__dirname+`\\data\\accounts\\${checkStr}`,`utf8`,(err,data) => {
                    acctInfo = JSON.parse(data)
                    console.log(acctInfo)
                    if(acctInfo.password===pw) loginSuccess = true;
                    rs()
                    
                    
                })
            })
            
        }
        i++
        if(i>=accts.length) checkedAll=true;
    }

    if(checkedAll && !acctFound)
    {
        console.log(`acct not found`)
        res.redirect(`/login`)
    }
    if(acctFound && loginSuccess)
    {
        console.log(`login success!`)
        res.cookie(`R21Auth`,sessionToken)
        res.cookie(`AID`,acctInfo.AID)
        res.redirect(`/home`)
    }
    if(acctFound && !loginSuccess)
    {
        console.log(`password wrong`)
        res.redirect(`/login`)
    }
    
})
//Initialize an account.
app.get(`/initAcct`,async (req,res) => {
    console.log(req.query.un,req.query.pw)
    //create a unique ID for the account. account IDs are 16 characters long.
    var genStr = `ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789`;
    var AID = ``
    for(var tokenCon = 0; tokenCon<16;tokenCon++)
    {
        AID += genStr[Math.floor(Math.random()*genStr.length)]
    }
    var j = {
        "username": req.query.un, 
        "password": req.query.pw, 
        "AID": AID,
        characters: [],
        games: []

    
    }
    await new Promise((rs,rj) => {
    var accStr = JSON.stringify(j)
        fs.writeFile(__dirname+`\\data\\accounts\\${req.query.un}_${AID}.json`,accStr,() => {
            rs()
        })
    })
    
    console.log(`ding!`)
    res.redirect(`/login`)
})

app.get(`/home`,(req,res) => {

    res.sendFile(__dirname+`\\data\\html\\home.html`)
})

app.get(`/createAGame`, (req,res) => {
    res.sendFile(__dirname+`\\data\\html\\createAGame.html`)
})

app.post(`/createGameInternal`, async (req,res)=> {
    console.log(`creating game...`)
    //create a unique ID for the game. Game IDs are 16 characters long.
    var genStr = `ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789`;
    var gameID = ``
    for(var tokenCon = 0; tokenCon<16;tokenCon++)
    {
        gameID += genStr[Math.floor(Math.random()*genStr.length)]
    }
    console.log(gameID)
    //get the background image as a b64-encoded string.
    var bg64 = req.body.bgData
    bg64 = bg64.replace(`data:image/png;base64,`,``)
    //write the image to the game BG folder.
    fs.writeFile(`data\\gameImages\\bgi_${gameID}.png`,bg64,'base64', ()=> {
        console.log(`ding or whatever`)
    })
    //write a game JSON to the games folder.
    var newGameJSON = {
        "ownerAID": req.cookies.AID,
        GID: gameID,
        gameName: `ttt`,
        players: [],
        entities: [],
        fog: []
    }
    


    fs.writeFile(`data\\games\\game_${gameID}.JSON`,JSON.stringify(newGameJSON),'utf8', ()=> {
        console.log(`wrote game.`)
    })
    res.redirect(`/gamedm`)
})

app.get(`/beginInstance`, (req,res) => {
    res.sendFile(__dirname+`\\data\\html\\chat.html`)
})

app.get(`/hostagame`, (req,res) => {
    res.sendFile(__dirname+`\\data\\html\\hostAGame.html`)
})

app.get(`/createacharacter`, (req,res) => {
    res.sendFile(__dirname+`\\data\\html\\createACharacter.html`)
})


// a function that locates a full account filename by AID
let readAccountDataByAID = async (AID) => {
    return new Promise(async (rs1,rj1)=> {        
        var accts = await new Promise((rs,rj) => {
            console.log(__dirname + `\\data\\accounts`)
            fs.readdir(__dirname + `\\data\\accounts`, (err,files) => {
                rs(files)
            })
        })
        var i = 0;
        var foundAcc = false;
        var regCheck = `.+_${AID}\.json`
        var outStr = `NONE`;
        while(i<accts.length && !foundAcc)
        {
            if(accts[i].match(regCheck))
            {
            foundAcc=true
            outStr=accts[i].match(regCheck)[0];
            i--
            }
            i++
        }
        rs1(outStr)
    })

}

//create a character
app.post(`/createCharacterInternal`, async (req,res)=> {
    //create a character ID.
    var AID = req.cookies.AID
    var genStr = `ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789`;
    var CID = ``
    for(var tokenCon = 0; tokenCon<16;tokenCon++)
    {
        CID += genStr[Math.floor(Math.random()*genStr.length)]
    }
    console.log(CID)

    //write the JSON. remove the image buffer as its no longer needed
    var charData = JSON.parse(JSON.stringify(req.body))
    delete charData.imgBuffer64
    charData.CID = CID

    //Check if character is OK for creation.

    if(charData.name===``)
    {
        console.log(`returning.`)
        res.send({status:`FIELD_INVALID`,note:`Name cannot be empty. Idiot.`})
        return
    }


    //handle, resize, write
    console.log(`received character creation request`)
    var ib64 = await resizeToPNGBuffer(req.body.imgBuffer64,100,100)
    console.log(`imgbuffer is ${ib64.length}`)
    await new Promise ((rs,rj)=> {
        fs.writeFile(`.\\data\\characterImages\\${CID}_cimg.png`,ib64,`base64`,()=> {
            console.log(`done writing image`)
            rs()
        })
    })




    
    //read the acct w/ appropriate filename
    var fullAcctName = await readAccountDataByAID(AID);
    console.log(`retrieved ${fullAcctName}`)
    var accInfo = await new Promise((rs,rj) => {
        fs.readFile(__dirname+`\\data\\accounts\\${fullAcctName}`,`utf8`,(err,data) => {
            var tj = JSON.parse(data)
            rs(tj)
        })
    })
    accInfo.characters.push(CID)

    //rewrite the account info
    console.log(accInfo)
    await new Promise ((rs,rj)=> {
        fs.writeFile(`.\\data\\accounts\\${fullAcctName}`,JSON.stringify(accInfo),`utf8`,()=> {
            console.log(`done writing acct`)
            rs()
        })
    })

    //write the character info
    console.log(accInfo)
    await new Promise ((rs,rj)=> {
        fs.writeFile(`.\\data\\characters\\${accInfo.AID}_${CID}.json`,JSON.stringify(charData),`utf8`,()=> {
            console.log(`done writing acct`)
            rs()
        })
    })
    //console.log(charData)
    res.send({status:`SUCCESS`})
    return


    
})

app.get(`/chooseyourfighter`, async(req,res) => {
    
    var reqAID = req.cookies.AID
    
    res.sendFile(__dirname+`/data/html/chooseyourfighter.html`)

})

//list all characters that a player has.
app.get(`/listCharacters`, async(req,res) => {

    //get a list of all characters an AID owns
    var reqAID = req.cookies.AID
    var AIDregex = `${reqAID}_.{16}`
    var acctCharas = []
    console.log(`getting characters for ${reqAID}`)
    var chars = await new Promise((rs,rj) => {
        fs.readdir(__dirname + `\\data\\characters`, (err,files) => {
            rs(files)
        })
        
    })
    for(var i = 0; i<chars.length;i++)
    {
        if(chars[i].match(AIDregex))
        {
            acctCharas.push(chars[i].match(AIDregex)[0])
        } 
    }

    //read the accompanying JSONs and their data
    var charactersResponse = {availableCharacters: []}
    for(var i =0; i<acctCharas.length;i++)
    {
        console.log(`${acctCharas[i]}.json`)
        var chara = await new Promise((rs,rj) => {
            console.log(__dirname+`\\data\\characters\\${acctCharas[i]}.json`)
            fs.readFile(__dirname+`\\data\\characters\\${acctCharas[i]}.json`,`utf8`,(err,data) => {
                rs(data)
            })
        })
        console.log(charactersResponse.availableCharacters.push(JSON.parse(chara)))
    }


    console.log(`ding!`)
    res.send(charactersResponse)
})

//Prepare the server for a hosted game. Load data into server memory for easy distribution and to reduce reads. The largest item is the background image, and that's not usually any bigger than 20mb (for a very large background). Memory space is not an issue as only one game can be loaded at a time, per server instance.
app.get(`/hostInit`, async (req,res) => {
    //first check that the requested game exists.
    var games;
    var gameInfo;
    await new Promise((rs,rj) => {
        console.log(__dirname + `\\data\\games`)
        fs.readdir(__dirname + `\\data\\games`, (err,files) => {
            games = files.slice()
            rs()
        })
        
    })
    if(!games.includes(`game_${req.query.GID}.JSON`))
    {
        console.log(`game ${req.query.GID} not found!`)
        res.send(`No game with that ID was found!`)
        return
    }
    console.log(`game ${req.query.GID} found!`)
    //next check that the requesting host owns the game theyre trying to start.
    await new Promise((rs,rj) => {
        fs.readFile(__dirname+`\\data\\games\\game_${req.query.GID}.JSON`,`utf8`,(err,data) => {
            gameInfo = JSON.parse(data)
            rs()
        })
    })
    if(gameInfo.ownerAID!==req.cookies.AID)
    {
        console.log(`The requester doesnt own the requested game.`)
        res.send(`You don't own this game!`)
        return
    }
    
    console.log(gameInfo)
    //Now load game info into system memory.
    currentHostAID = req.cookies.AID;
    currentGID = gameInfo.GID;
    currentGameInfo = JSON.parse(JSON.stringify(gameInfo))
    //load image buffer into memory.
    currentImgBuffer = await new Promise((rs,rj) => {
        fs.readFile(__dirname+`\\data\\gameImages\\bgi_${req.query.GID}.png`,`base64`,(err,data) => {
            rs(data)
        })
    })


    /////////////add a test player!
    //add a test unage
    var testImageBuffer = await new Promise((rs,rj) => {
        fs.readFile(__dirname+`/literallyme.png`,`base64`,(err,data) => {
            rs(data)
        })
    })
    //add a test player.
    currentGameInfo.players.push({
        currXPos: 75,
        currYPos: 50,
        currHealth: 40,
        currImage: testImageBuffer,
        CID: `ABCDEFGHIJKLMNOP`,
        characterData: {
            name: "Katori",
            maxHealth: `40`
        }
    })
    currentGameInfo.players.push({
        currXPos: 200,
        currYPos: 500,
        currHealth: 10,
        currImage: testImageBuffer,
        CID: `123456789ABCDEFG`,
        characterData: {
            name: "Ooyodo",
            maxHealth: `47`
        }
    })

    console.log(`A game has been initialized!\n_________________________________________________`)
    console.log(`Current GID: ${currentGID}\nCurrent host AID: ${currentHostAID}\nCurrent game info:`)
    //console.log(currentGameInfo)

    res.redirect(`/gamedm`)

})

app.get(`/gamedm`, async (req,res) => {
    res.sendFile(__dirname+`\\data\\html\\gamedm.html`)
})

app.get(`/gameplayer`, async (req,res) => {
    res.sendFile(__dirname+`\\data\\html\\gameplayer.html`)
})


//this is a shitty auth checker! this is not a permanent fixture!
let checkAuth = (r) => {
    if(r.cookies && r.cookies.R21Auth===sessionToken) return true
    else return false
}

//takes in a dataURL of any image type and returns it as a plain B64 PNG buffer.
let resizeToPNGBuffer = async (buf,x,y) => {
    return new Promise((rs,rj) => {
        console.log(`converting... imgbuffer length is ${buf.length}`)
        var tempImg = new Image()
        
        tempImg.onerror = () => { console.log(`error!`)}
        tempImg.onload = () => {
            console.log(`processing image`)
            
            
            //handle the image.
            
            c = createCanvas(100,100)
            const ctx = c.getContext(`2d`)
            ctx.drawImage(tempImg,0,0,x,y)
            var tdu = c.toDataURL('image/png')
            tdu = tdu.replace(`data:image/png;base64,`,``)
            rs(tdu)
        }
        tempImg.src = buf;
    })
    
   
    
    
}
