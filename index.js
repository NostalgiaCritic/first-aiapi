const express = require('express');
const {v4: uuidv4} = require('uuid');
const fs = require('fs');
const multer = require('multer');
const {Configuration, OpenAIApi} = require('openai');
const configuration = new Configuration({
  apiKey: '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',
});
const app = express();
var cors = require('cors')
const openai = new OpenAIApi(configuration);
const upload = multer({dest: 'uploads/'});

app.use(express.json());
app.use(express.urlencoded({extended: true}));
app.set('view engine', 'ejs');
app.use(cors())

//** get 뷰파일 불러오기 */
app.get('/', (req, res) => {
  res.render('index');
});
app.get('/chat', (req, res) => {
  res.render('chat');
});
app.get('/chatinfo', (req, res) => {
  res.render('chatinfo');
});
app.get('/audio', (req, res) => {
  res.render('audio');
});
app.get('/summarize', (req, res) => {
  res.render('summarize');
});
app.get('/translate', (req, res) => {
  res.render('translate');
});

//** post API 통신 */
//** 광고 문구 */
app.post('/create_ad_slogan', async (req, res) => {
  const {product, content, ton} = req.body;
  try {
    const result = await sloganGpt(product, content, ton);
    // console.log(result, 'create-ton')
    res.json(result);
  } catch (e) {
    res.status(400).json(e)
  }
})
async function sloganGpt(product, content, ton) {
  const instruction = 'assistant 콘텐츠검생광고 문구 작성 도우미로 동작한다. user의 내용을 참고하여 마케팅 문구를 작성해라';
  let prompt = `제품 이름 : ${product}
  주요 내용: ${content}
  광고 문구의 스타일: ${ton}
  위 내용을 참고하여 콘텐츠검색광고 문구를 만들어라.
  `
  try {
    const completion = await openai.createChatCompletion({
      model: 'gpt-3.5-turbo',
      messages: [
        {role: 'system', content: instruction},
        {role: 'user', content: prompt},
      ],
    });
    // console.log(completion.data.choices[0].message);
    return {translatedText: completion.data.choices[0].message.content};
  } catch (error) {
    console.error(error);
    return error;
  }
}

//** 친구 같은 챗봇 */
app.post('/chat', async (req, res) => {
  const {message} = req.body;
  // ChatGPT와의 대화
  try {
    const response = await openai.createChatCompletion({
      model: "gpt-3.5-turbo",
      messages: [
        {"role": "system", "content": "너는 친구같이 대화 해주는 bot이다."},
        {"role": "user", "content": message}
      ],
    });
    const reply = response.data.choices[0].message.content;
    console.log(reply)
    res.json({text: reply});
  } catch (error) {
    console.error('ChatGPT 요청 중 오류 발생:', error);
    res.status(500).json({error: 'ChatGPT 요청 중 오류가 발생했습니다.'+ error});
  }
});

//** 정보성 챗봇 */
app.post('/chatinfo', async (req, res) => {
  console.log(req.body);
  const { text } = req.body;
  console.log(text);
  
  const instruction ='assistant는 인공지능 챗봇으로서 동작한다. 사용자의 질문내용과 의도에 가장 알맞는 내용을 답변한다.';
  // console.log(text,'함수안에');
  try {
    const completion = await openai.createChatCompletion({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: instruction },
        { role: 'user', content: text },
      ],
    });

    const data = { translatedText: completion.data.choices[0].message }
    console.log(data)
    res.json(data);

  } catch (error) {
    // console.error(error);
    res.status(500).json({ error: 'Error in translation' });
  }
});

//** 번역 */
app.post('/translate', async (req, res) => {
  console.log(req.body);
  const { text, to, from } = req.body;
  console.log(text, to, from);
  let fewshot_messages = []
  
  function build_fewshot(from, to){
    let src_examples = parallel_example[from]
    let trg_examples = parallel_example[to]
    
    const parallel_example = {
      "한국어":["오늘 날씨 어때","딥러닝 기반의 AI기술이 인기를 끌고 있다."],
      "영어":["How is the weather today","Deep learning-based AI technology is gaining popularity."],
      "일본어":["今日の天気はどうですか","ディープラーニングベースのAI技術が人気を集めています。"]
    }
    for (let i = 0; i < src_examples.length; i++) {
      fewshot_messages.push({"role":"user","content":src_examples[i]});
      fewshot_messages.push({"role":"assistant","content":trg_examples[i]});
  }
  return fewshot_messages;
  }
  const instruction =
    `assistant는 번역앱으로서 동작한다. ${from}를 ${to}로 적절하게 번역하고 번역된 텍스트만 출력한다.`;
  try {
    const completion = await openai.createChatCompletion({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: instruction },
        ...fewshot_messages,
        { role: 'user', content: text },
      ],
    });

    console.log(completion.data.choices[0].message);
    console.log(instruction);
    res.json({ translatedText: completion.data.choices[0].message.content });
    // const response = await openai.complete({
    //   engine: 'gpt-3.5-turbo',
    //   prompt: text,
    //   max_tokens: 60,
    // });
    // res.json({ translatedText: response.data.choices[0].text });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error in translation' });
  }
});

//** 요약 */
app.post("/summarize", async (req, res) => {
  console.log(req.body.text);
  const summary = await summarize(req.body.text);
  res.json({ summary: summary });
});

async function summarize(text) {
  const instruction = "assistant는 user의 입력을 bullet point로 3줄 요약해준다.";

  try {
    const response = await openai.createChatCompletion({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: instruction },
        { role: "user", content: text },
      ],
    });

    const result = response["data"]["choices"][0]["message"]["content"];
    return result;
  } catch (error) {
    // console.log(error);
    return null;
  }
}

//** 음성채팅 */
app.post('/audio', upload.single('audioData'), (req, res) => {
  // req.body에는 오디오 데이터가 포함됩니다.
  // console.log(req.file);
  const audioData = req.file.path;
  // 3-2. 오디오 데이터를 파일로 저장한다.
  const filename = `audio_text.wav`; // 고유한 파일 이름 생성
  fs.writeFile(filename, audioData, 'binary', (err, item) => {
    if (err) {
      // console.error('Failed to save audio file:', err);
      res.status(500).send('Failed to save audio file');
    } else {
      // console.log(filename);
      // 3-3. 파일로 저장된 음성을 텍스트로 변환하여 Chat API와 통신한다.
      convertAudioToText(req.file)
        .then((result) => {
          // Chat API와 대화 진행
          // const text = result.
          // console.log(text, 'text');
          // const chatResponse = chatWithAPI(text);
          // 클라이언트로 응답 전송
          // res.json({text: chatResponse});
          res.json({text: 'hoho'})
        })
        .catch((error) => {
          console.error('Failed to convert audio to text:', error);
          res.status(500).send('Failed to convert audio to text');
        });
    }
  });
});

async function convertAudioToText(filename) {
  try {
    const resp = openai.createTranscription(
      filename,
      "whisper-1"
    );
    const reply = resp;
    console.log(reply);
    console.log('convert');
    return reply;
  } catch (e) {
    console.error(e, 'error convert');
    return e;
  }
}

async function chatWithAPI(text) {
  const result = await openai.createChatCompletion({
    model: "gpt-3.5-turbo",
    messages: [
      {"role": "system", "content": "아주 자세히 설명해주는 ai야."},
      {"role": "user", "content": text}
    ],
  });
  const reply = result.data.choices[0].message.content;
  console.log(reply, 'chatwith');
  return reply;
}

app.listen(3000, () => {
  console.log('Server is running on port 3000');
});


