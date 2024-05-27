const express = require('express')
const app = express()
const session = require('express-session')
const passport = require('passport')
const LocalStrategy = require('passport-local')
const bcrypt = require('bcrypt')
const MongoStore = require('connect-mongo')
require('dotenv').config()

const { createServer } = require('http')
const { Server } = require('socket.io')
const server = createServer(app)
const io = new Server(server)

const { S3Client } = require('@aws-sdk/client-s3')
const multer = require('multer')
const multerS3 = require('multer-s3')
const s3 = new S3Client({
  region : 'ap-northeast-2',
  credentials : {
      accessKeyId : process.env.IAM_ACCESSKEY,
      secretAccessKey : process.env.IAM_SECRETKEY
  }
})

const upload = multer({
  storage: multerS3({
    s3: s3,
    bucket: 'astltestbucket',
    key: function (요청, file, cb) {
      cb(null, Date.now().toString()) //업로드시 파일명 변경가능
    }
  })
})

app.use(express.static(__dirname + '/public'))
app.set('view engine', 'ejs')
app.use(express.json())
app.use(express.urlencoded({extended:true}))

const { MongoClient, ObjectId } = require('mongodb')
let db
const url = process.env.DB_URL
new MongoClient(url).connect().then((client) => {
  console.log('DB 연결됨')
  db = client.db('ASTL-Database')
  server.listen(process.env.PORT, () => {
    console.log('port open')
  })
}).catch((err) => {
  console.log(err)
})

// passport 라이브러리 세팅
app.use(passport.initialize())
const sessionMiddleware = session({
  secret: process.env.HASH_PASSWORD,
  resave : false,
  saveUninitialized : false,
  cookie : { maxAge : 60 * 60 * 1000 },
  // *************세션 만료된 상태로 commit 했을 때 예외처리
  store : MongoStore.create({
    mongoUrl : process.env.DB_URL,
    dbName : 'ASTL-Database'
  })
}) // 세션 설정
app.use(sessionMiddleware)
app.use(passport.session())

app.get('/', async (req, res) => {
  res.render('main.ejs')
  console.log(req.session)
})

// 총 연도 중복없이 가져오기(내림차순)
function getYear(array) {
  let year = []
  for (i=0; i<array.length; i++) {
    year.push(array[i].year)
  }
  let result = [...new Set(year)]
  return result.sort((a,b)=>(b-a))
}

app.get('/research', async (req, res) => {
  try {
    let result1 = await db.collection('research').find().toArray()
    let sort = getYear(result1)
    let arr = []
    for (i=0; i<sort.length; i++) {
      let result = await db.collection('research').find({year : sort[i]}).toArray()
      result.reverse()
      arr.push(result)
    }
    res.render('research.ejs', {yearlist : sort, research_list : arr})
  } catch {
    console.log(err)
  }
})

app.get('/prof', async (req, res) => {
  let result1 = await db.collection('prof_1').find({status : "current"}).sort({_id : -1}).toArray()
  let result2 = await db.collection('prof_1').find({status : "former"}).sort({_id : -1}).toArray()
  let result3 = await db.collection('prof_2').find().sort({_id : -1}).toArray()
  let result4 = await db.collection('prof_3').find().sort({_id : -1}).toArray()
  let result5 = await db.collection('prof_4').find().sort({_id : -1}).toArray()
  res.render('prof.ejs', {
    current_career : result1,
    former_career : result2,
    outside_act : result3,
    awards : result4,
    books : result5
  })
})

app.get('/members', async (req, res)=>{
  let result1 = await db.collection('members').find({part : 'neuroscience'}).toArray()
  let result2 = await db.collection('members').find({part : 'digitalscience'}).toArray()
  let result4 = await db.collection('members').find({part : 'clinicalresearch'}).toArray()
  let result3 = await db.collection('members').find({part : 'former'}).toArray()
  res.render('members.ejs', {
    neuroscience : result1,
    digitalscience : result2,
    former : result3,
    clinical : result4
  })
})

// id 예외처리
app.get('/gallery/:id', async (req, res)=>{
  let id = req.params.id
  let result1 = await db.collection('gallery').find().sort({_id : -1}).toArray()
  let result2 = await db.collection('gallery').find().sort({_id : -1}).skip(6*(id - 1)).limit(6).toArray()
  res.render('gallery.ejs', {
    id : id,
    gallery : result2,
    page : result1
  })
})

app.get('/gallery/content/:id', async (req, res)=>{
  let id = req.params.id
  let result = await db.collection('gallery').findOne({_id : new ObjectId(id)})
  res.render('gallery_content.ejs', {
    gallery_content : result
  })
})

app.get('/notice', async (req, res)=>{
  let result = await db.collection('notice').find().sort({_id : -1}).toArray()
  res.render('notice.ejs', { notice : result })
})

app.get('/notice/content/:id', async (req, res)=>{
  let id = req.params.id
  let result = await db.collection('notice').findOne({_id : new ObjectId(id)})
  res.render('notice_content.ejs', {
    notice_content : result
  })
})

app.get('/info', (req, res)=>{
  res.render('info.ejs')
})

passport.use(new LocalStrategy(async (입력한아이디, 입력한비번, cb) => {
  let result = await db.collection('user').findOne({ username : 입력한아이디})
  if (!result) {
    return cb(null, false, { message: '존재하지 않는 ID' })
  }
  if (await bcrypt.compare(입력한비번, result.password)) {
    return cb(null, result)
  } else {
    return cb(null, false, { message: '비밀번호 불일치' })
  }
}))

passport.serializeUser((user, done) => {
  process.nextTick(() => {
    done(null, { id: user._id, username: user.username })
  })
})

passport.deserializeUser(async (user, done) => {
  let result = await db.collection('user').findOne({_id : new ObjectId(user.id)})
  delete result.password
  process.nextTick(() => {
    return done(null, result)
  })
})

app.get('/login', (req, res)=>{
  if (req.user) {
    if (req.user.username == process.env.USERNAME) {
      res.redirect('/admin/notice')
    }
  } else {
    res.render('login.ejs')
  }
})

app.post('/login', (req, res) => {
  passport.authenticate('local', (error, user, info) => {
    if (error) return res.status(500).json(error)
      if (!user) return res.status(401).json(info.message)
      req.logIn(user, (err) => {
        if (err) return next(err)
        res.redirect('/admin/notice')
      })
  })(req, res)
})

app.get('/admin/research/:id', async (req, res) => {
  if (req.user) {
    if (req.user.username == 'ajouadmin') {
      let id = req.params.id
      let result1 = await db.collection('research').find({year : id}).toArray()
      let result2 = await db.collection('research').find().sort({_id : -1}).toArray()
      let sort = getYear(result2)
      res.render('admin_research.ejs', {research : result1, yearlist : sort})
    } else {
      res.render('alert.ejs', {msg : '관리자만 접근 가능합니다...'})
    }
  } else {
    res.render('alert.ejs', {msg : '관리자만 접근 가능합니다...'})
  }
})

app.get('/admin/research-edit/:id', async (req, res) => {
  // 나중에 까먹을 수도...유효하지 않은 id 입력시...예외처리 // try-catch 추가
  let id = req.params.id
  let result = await db.collection('research').findOne({_id : new ObjectId(id)})
  if (req.user) {
    if (req.user.username == 'ajouadmin') {
      res.render('admin_research_edit.ejs', {edit : result})
    } else {
      res.render('alert.ejs', {msg : '관리자만 접근 가능합니다...'})
    }
  } else {
    res.render('alert.ejs', {msg : '관리자만 접근 가능합니다...'})
  }
})

app.post('/edit-research', async (req, res)=>{
  await db.collection('research').updateOne({_id : new ObjectId(req.body.id)}, {$set : {
    year : req.body.year,
    journal : req.body.journal,
    doi : req.body.doi,
    if : req.body.if,
    title : req.body.title,
    author : req.body.author,
    url : req.body.url
  }})
  res.render('success.ejs', {success : '수정되었습니다.', url : 'research/2017'})
})

app.post('/research-delete/:id', async (req, res)=>{
  let id = req.params.id
  console.log(id)
  db.collection('research').deleteOne({_id : new ObjectId(id)})
  res.render('success.ejs', {success : '삭제가 완료되었습니다.', url : 'research/2017'})
})

app.get('/admin/notice', (req, res) => {
  if (req.user) {
    if (req.user.username == 'ajouadmin') {
      res.render('admin_notice.ejs')
      console.log('관리자 접속')
    } else {
      res.render('alert.ejs', {msg : '관리자만 접근 가능합니다...'})
    }
  } else {
    res.render('alert.ejs', {msg : '관리자만 접근 가능합니다...'})
  }
})

app.get('/admin/prof', (req, res) => {
  if (req.user) {
    if (req.user.username == 'ajouadmin') {
      res.render('admin_prof.ejs')
    } else {
      res.render('alert.ejs', {msg : '관리자만 접근 가능합니다...'})
    }
  } else {
    res.render('alert.ejs', {msg : '관리자만 접근 가능합니다...'})
  }
})

app.post('/prof1', async (req, res)=>{
  try {
    if (req.body.status && req.body.year && req.body.content) {
      await db.collection('prof_1').insertOne({
        status : req.body.status,
        year : req.body.year,
        content : req.body.content
      })
      res.render('success.ejs', {success : '추가되었습니다.', url : 'prof'})
    } else {
      res.render('back_alert.ejs', {error : '모든 항목을 입력해주세요'})
    }
  } catch(error) {
    console.log(error)
  }
})

app.post('/prof2', async (req, res)=>{
  try {
    if (req.body.content) {
      await db.collection('prof_2').insertOne({
        content : req.body.content
      })
      res.render('success.ejs', {success : '추가되었습니다.', url : 'prof'})
    } else {
      res.render('back_alert.ejs', {error : '모든 항목을 입력해주세요'})
    }
  } catch(error) {
    console.log(error)
    // 서버 에러 alert 해주기
  }
})

app.post('/prof3', async (req, res)=>{
  try {
    if (req.body.content && req.body.year) {
      await db.collection('prof_3').insertOne({
        content : req.body.content,
        year : req.body.year
      })
      res.render('success.ejs', {success : '추가되었습니다.', url : 'prof'})
    } else {
      res.render('back_alert.ejs', {error : '모든 항목을 입력해주세요'})
    }
  } catch(error) {
    console.log(error)
    // 서버 에러 alert 해주기
  }
})

app.post('/prof4', async (req, res)=>{
  try {
    if (req.body.content && req.body.year) {
      await db.collection('prof_4').insertOne({
        content : req.body.content,
        year : req.body.year
      })
      res.render('success.ejs', {success : '추가되었습니다.', url : 'prof'})
    } else {
      res.render('back_alert.ejs', {error : '모든 항목을 입력해주세요'})
    }
  } catch(error) {
    console.log(error)
    // 서버 에러 alert 해주기
  }
})

app.get('/admin/members', async (req, res) => {
  if (req.user) {
    if (req.user.username == 'ajouadmin') {
      let result1 = await db.collection('members').find({part : 'neuroscience'}).toArray()
      let result2 = await db.collection('members').find({part : 'digitalscience'}).toArray()
      let result4 = await db.collection('members').find({part : 'clinicalresearch'}).toArray()
      let result3 = await db.collection('members').find({part : 'former'}).toArray()
      res.render('admin_members.ejs', {
        neuroscience : result1,
        digitalscience : result2,
        former : result3,
        clinical : result4
      })
    } else {
      res.render('alert.ejs', {msg : '관리자만 접근 가능합니다...'})
    }
  } else {
    res.render('alert.ejs', {msg : '관리자만 접근 가능합니다...'})
  }
})

app.post('/members', upload.single('member-img'), async (req, res)=>{
  try {
    await db.collection('members').insertOne({
      img : req.file.location,
      name : req.body.name,
      part : req.body.part,
      degree : req.body.degree,
      position : req.body.position,
      year : req.body.year,
      content : req.body.content,
      mail : req.body.mail,
      tel : req.body.tel
    })
    res.render('success.ejs', {success : '추가되었습니다.', url : 'members'})
  } catch(error) {
    console.log(error) // render로 알림
  }
})

app.get('/admin/member-edit/:id', async (req, res) => {
  // 나중에 까먹을 수도...유효하지 않은 id 입력시...예외처리 // try-catch 추가
  let id = req.params.id
  let result = await db.collection('members').findOne({_id : new ObjectId(id)})
  if (req.user) {
    if (req.user.username == 'ajouadmin') {
      res.render('admin_members_edit.ejs', {edit : result})
    } else {
      res.render('alert.ejs', {msg : '관리자만 접근 가능합니다...'})
    }
  } else {
    res.render('alert.ejs', {msg : '관리자만 접근 가능합니다...'})
  }
})

app.post('/member-edit', upload.single('member-img'), async (req, res)=>{
  if (req.file) {
    await db.collection('members').updateOne({_id : new ObjectId(req.body.id)}, {$set : {
      img : req.file.location,
      name : req.body.name,
      part : req.body.part,
      degree : req.body.degree,
      position : req.body.position,
      year : req.body.year,
      content : req.body.content,
      mail : req.body.mail,
      tel : req.body.tel
    }})
  } else {
    await db.collection('members').updateOne({_id : new ObjectId(req.body.id)}, {$set : {
      name : req.body.name,
      part : req.body.part,
      degree : req.body.degree,
      position : req.body.position,
      year : req.body.year,
      content : req.body.content,
      mail : req.body.mail,
      tel : req.body.tel
    }})
  }
  res.render('success.ejs', {success : '수정되었습니다.', url : 'members'})
})

app.post('/delete-member/:id', async (req, res)=>{
  let id = req.params.id
  db.collection('members').deleteOne({_id : new ObjectId(id)})
  res.render('success.ejs', {success : '삭제가 완료되었습니다.', url : 'members'})
})

app.get('/admin/gallery', async (req, res) => {
  if (req.user) {
    if (req.user.username == 'ajouadmin') {
      let result = await db.collection('gallery').find().sort({_id : -1}).toArray()
      res.render('admin_gallery.ejs', { gallery : result })
    } else {
      res.render('alert.ejs', {msg : '관리자만 접근 가능합니다...'})
    }
  } else {
    res.render('alert.ejs', {msg : '관리자만 접근 가능합니다...'})
  }
})

app.post('/addpic', upload.array('adminimg'), async (req, res) => {
  try {
    if (req.body.imgtitle) {
      let imglist = []
      for (let i=0; i<req.files.length; i++) {
        imglist.push(req.files[i].location)
      }
      await db.collection('gallery').insertOne({
        title : req.body.imgtitle,
        imgurl : imglist,
        content : req.body.content,
        time : CurrentTime(),
      })
      res.render('success.ejs', {success : '추가되었습니다.', url : 'gallery'})
    } else {
      res.render('back_alert.ejs', {error : '이미지를 추가해주세요'})
    }
  } catch(error) {
    console.log(error)
  }
})

app.post('/delete-pic/:id', async (req, res)=>{
  let id = req.params.id
  db.collection('gallery').deleteOne({_id : new ObjectId(id)})
  res.render('success.ejs', {success : '삭제가 완료되었습니다.', url : 'gallery'})
})

function CurrentTime() {
  var current = new Date()
  var hour = current.getHours()
  var minute = current.getMinutes()
  var year = current.getFullYear()
  var month = current.getMonth()+1
  var day = current.getDate()
  return year + '/' + zeros(month) + '/' + zeros(day) + ' ' + zeros(hour) + ':' + zeros(minute)
}
function zeros(num) {
  if (num < 10) {
    return '0'+num
  }
  else {
    return num
  }
}

io.engine.use(sessionMiddleware)
io.on('connection', (socket)=>{
  
  socket.on('disconnect', () => {
    console.log('user disconnected')
  })
  // 논문 편집방
  socket.on('ask-join-research', (data)=>{
    socket.join(data)
  })
  socket.on('research-data', async (data) => {
    await db.collection('research').insertOne({
      year : data.research_year,
      journal : data.research_journal,
      doi : data.research_doi,
      if : data.research_if,
      title : data.research_title,
      author : data.research_author,
      url : data.research_url
    })
  })
  
  // 공지사항 등록방
  socket.on('ask-join-notice', (data)=>{
    socket.join(data)
  })
  socket.on('notice-data', async (data) => {
    await db.collection('notice').insertOne({
      title : data.notice_title,
      content : data.notice_content,
      time : CurrentTime()
    })
  })
})

///////////
app.get('/hidden/1276ce5', (req, res) => {
  res.redirect('https://arcanephenomenelab.github.io/web_ver2.0/')
})
