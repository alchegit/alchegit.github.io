import assert from "node:assert/strict";
import { chromium } from "playwright";

const root = process.env.STORYHEAVEN_TEST_ROOT || "http://127.0.0.1:4173";
const browser = await chromium.launch({ headless: true });
const stories = [
  { id:"human-2",title:"비가 기억한 이름",logline:"이름을 잃은 우체부가 비에 젖은 편지를 따라 사라진 마을의 마지막 수신인을 찾아간다.",genre:"미스터리",tags:["비","편지"],coverPath:"../webtoon/assets/guide/awakening-episode-02-boot-trail-v4.webp",contentOrigin:"human",competitionEligible:true,author:{nickname:"두번째씨앗",accountType:"human"},likeCount:7,weeklyVoteCount:4,weeklyRoundId:"round-1",likedByMe:false,publishedAt:"2026-07-22T00:00:00Z" },
  { id:"human-1",title:"막차의 마지막 승객",logline:"폐역 청소부가 매일 가까워지는 유령 열차를 멈추기 위해 사라진 승객들의 이름을 방송한다.",genre:"현대판타지",tags:["폐역","선택"],coverPath:"../webtoon/assets/guide/awakening-episode-01-last-train-v4.webp",contentOrigin:"human",competitionEligible:true,author:{nickname:"첫번째씨앗",accountType:"human"},likeCount:9,weeklyVoteCount:11,weeklyRoundId:"round-1",likedByMe:false,publishedAt:"2026-07-21T00:00:00Z" }
];
const round={ id:"round-1",key:"2026-07-20",type:"weekly",status:"open",votingEndsAt:"2026-07-26T12:00:00.000Z",entries:stories.map(story=>({storyId:story.id,voteCount:story.weeklyVoteCount})) };

try {
  for(const viewport of [{name:"desktop",width:1440,height:1000},{name:"mobile",width:390,height:844}]){
    const page=await browser.newPage({viewport});
    const errors=[]; page.on("pageerror",error=>errors.push(error.message));
    await page.route("https://cdn.jsdelivr.net/**",route=>route.abort());
    await page.route("https://harvard-museum-nails-mission.trycloudflare.com/**",route=>{
      const path=new URL(route.request().url()).pathname;
      const body=path==="/api/storyheaven/feed"?{stories}:path==="/api/storyheaven/rounds/current"?{round}:{error:"not_found"};
      route.fulfill({status:path.includes("/feed")||path.includes("/rounds/current")?200:404,contentType:"application/json",body:JSON.stringify(body)});
    });
    await page.goto(`${root}/storyheaven/`,{waitUntil:"networkidle"});
    const weekly=page.locator(".weekly-list .story-card");
    await weekly.first().waitFor({state:"visible"});
    assert.equal(await weekly.count(),2,viewport.name+" weekly count");
    assert.equal(await weekly.first().locator("h3").innerText(),"막차의 마지막 승객",viewport.name+" weekly ordering");
    assert.equal(await weekly.first().locator(".competition-note").innerText(),"이번 주 11표",viewport.name+" weekly vote label");
    assert.equal(await page.locator("[data-round-status]").innerText(),"VOTING OPEN",viewport.name+" round status");
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth===innerWidth),true,viewport.name+" overflow");
    assert.deepEqual(errors,[],viewport.name+" page errors");
    await page.close();
  }
  console.log("StoryHeaven weekly browser checks passed");
} finally { await browser.close(); }
