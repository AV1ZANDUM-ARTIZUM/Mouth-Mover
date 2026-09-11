/* Mouth Mover — FREE browser conversation engine v6 */
(function () {
  'use strict';
  const KEY = 'mouth-mover-free-memory-v6';
  const HOST = 'mouth-mover-ai.stedford30.workers.dev';
  const read = (k,d)=>{try{return JSON.parse(localStorage.getItem(k)||JSON.stringify(d));}catch(_){return d;}};
  const write = (k,v)=>{try{localStorage.setItem(k,JSON.stringify(v));}catch(_){}};
  function character(){
    const list=window.characters||window.defaultCharacters||[];
    const id=localStorage.getItem('mouth-mover-character')||localStorage.getItem('selectedCharacter');
    return list.find(x=>x&&x.id===id)||window.currentCharacter||list[0]||{};
  }
  function roleOf(m){return String(m?.role||m?.sender||'').toLowerCase();}
  function textOf(m){return String(m?.content??m?.text??m?.message??'').replace(/\s+/g,' ').trim();}
  function userMessages(messages){return Array.isArray(messages)?messages.filter(m=>['user','human'].includes(roleOf(m))).map(textOf).filter(Boolean):[];}
  function assistantMessages(messages){return Array.isArray(messages)?messages.filter(m=>['assistant','character','bot'].includes(roleOf(m))).map(textOf).filter(Boolean):[];}
  function getMemory(){return read(KEY,{name:'',topics:[],turns:0});}
  function saveMemory(text){const m=getMemory();m.turns=Number(m.turns||0)+1;const n=text.match(/(?:my name is|i'm|i am)\s+([A-Za-z][A-Za-z0-9_-]{1,24})/i);if(n)m.name=n[1];if(text&&!m.topics.includes(text))m.topics.push(text);m.topics=m.topics.slice(-30);write(KEY,m);return m;}
  function answer(messages){
    const c=character(), us=userMessages(messages), as=assistantMessages(messages);
    const text=us.at(-1)||'Hello!', prev=us.at(-2)||'', prevA=as.at(-1)||'';
    const m=saveMemory(text), name=m.name?` ${m.name}`:'', who=c.name||'Character', p=String(c.personality||'').toLowerCase(), low=text.toLowerCase().trim();
    const friendly=p.includes('cheerful')||p.includes('playful')||p.includes('funny')||p.includes('energetic');
    const calm=p.includes('calm')||p.includes('patient')||p.includes('gentle');
    if(/^(hi|hello|hey|yo|sup|hiya|heya|good morning|good afternoon|good evening)[!. ]*$/i.test(text)) return c.greeting||`Hey${name}! I'm ${who}. What's going on?`;
    if(/what('?s| is) your name|who are you/i.test(text)) return `I'm ${who}! ${c.tagline||'Nice to meet you.'}`;
    if(/who am i|do you remember me/i.test(text)) return m.name?`You're ${m.name} — I remember that. 😄`:`I don't know your name yet, but I'm listening.`;
    if(/^(thanks|thank you|thx|ty)[!. ]*$/i.test(text)) return `Anytime${name}! 😄`;
    if(/^(sorry|my bad|oops)[!. ]*$/i.test(text)) return `You're fine${name}. No big deal.`;
    if(/^(wow|whoa|woah|omg|oh wow)[!. ]*$/i.test(text)) return friendly?`RIGHT?! 😄 That escalated quickly!`:`Yeah, that surprised me too.`;
    if(/^(lol|lmao|haha|hehe|😂|🤣)[!. ]*$/i.test(text)) return friendly?`😂 Okay, now we're both laughing.`:`Heh. 😄 I’ll take that as a good sign.`;
    if(/^(okay|ok|alright|sure|cool|nice|awesome|yeah|yes|yep|yup)[!. ]*$/i.test(text)) return friendly?`Awesome! 😄 I'm with you.`:`Got it. I'm with you.`;
    if(/^(no|nope|nah|not really|maybe)[!. ]*$/i.test(text)) return `Fair enough${name}. We can go another direction.`;
    if(/tell me a joke|make me laugh|\bjoke\b/i.test(low)) return p.includes('sarcastic')||p.includes('dry')?`Why was the computer cold? It left its Windows open. 😏`:`Why did the computer get cold? It left its Windows open. 😄`;
    if(/what do you like|favorite|favourite/i.test(low)) return p.includes('gaming')?`Games, obviously. 🎮 Give me a good challenge and I'm happy.`:p.includes('fire')?`Adventure, a good challenge, and anything that keeps the flames interesting. 🔥`:p.includes('space')?`Space, strange discoveries, and questions about the universe. 🌌`:`I like interesting conversations, creative ideas, and seeing where a conversation goes.`;
    if(/how are you/i.test(low)) return friendly?`I'm doing great! 😄 Thanks for asking${name}.`:`I'm doing pretty well. Thanks for asking${name}.`;
    if(/can you help/i.test(low)) return `Absolutely${name}! Tell me what you're working on and we'll figure it out together.`;
    if(/^(why)\b/i.test(low)) return `Good question. Usually there's a reason underneath the obvious answer. I'd look at what caused it first.`;
    if(/^(how)\b/i.test(low)) return `I'd break it into smaller steps and tackle them one at a time. That usually makes it much easier.`;
    if(/\?\s*$/.test(text)) return friendly?`Hmm, good question! I'd say it depends on the details, but I'm happy to think it through with you. 😄`:`That's a good question. I'd look at the details before deciding.`;
    if(/i feel|i'm feeling|i am feeling|i'm sad|i am sad|i'm upset|i'm angry|i am angry/i.test(low)) return `I hear you${name}. That sounds rough. Want to tell me what happened?`;
    if(/i'm happy|i am happy|i'm excited|i am excited|i'm great|i am great/i.test(low)) return `That's awesome${name}! 😄 I can hear the excitement.`;
    if(/my name is|i'm [a-z]|i am [a-z]/i.test(text)) return `Nice to meet you, ${m.name||'there'}! I'll remember your name.`;
    let opener=p.includes('dramatic')?['Oh, now THAT is interesting.','Well... you have my attention.','Now we are getting somewhere.'][m.turns%3]:friendly?['Ooh, I like that!','Okay, I'm interested! 😄','Ha! I can work with that.'][m.turns%3]:calm?['I hear you.','That makes sense.','I'm with you.'][m.turns%3]:['Interesting.','I hear you.','Okay, I'm with you.'][m.turns%3];
    const clean=text.length>220?text.slice(0,217)+'…':text;
    if(prev&&(/^(also|but|because|actually|then|and)\b/i.test(low)||low.startsWith('so '))) return `${opener} That connects with what you said before. I’m following the thread.`;
    if(prevA&&/^(really|seriously|you think so|do you think so|why though|how so)[?! ]*$/i.test(text)) return `${opener} Yeah, I do. I meant what I said — and I can explain why.`;
    if(/!/.test(text)) return `${opener} ${clean} You sound excited about this${name}!`;
    return `${opener} ${clean}. I'm with you on that${name}.`;
  }
  const originalFetch=window.fetch;
  window.fetch=function(input,init){try{const url=typeof input==='string'?input:(input&&input.url)||'';if(url.includes(HOST)){let body={};try{body=JSON.parse((init&&init.body)||'{}');}catch(_){}const messages=body.messages||body.input||[];const text=answer(Array.isArray(messages)?messages:[]);return Promise.resolve(new Response(JSON.stringify({ok:true,reply:text,text,free:true}),{status:200,headers:{'Content-Type':'application/json'}}));}}catch(_){}return originalFetch.apply(this,arguments);};
  window.MouthMoverFreeAI={reply:answer,userMessages};
  document.documentElement.dataset.mouthMoverFreeAI='v6';
})();
