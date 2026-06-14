# Download server/crew logos from Namu Wiki (유설아 문서 및 각 서버·크루 문서 기준)
$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot
$out = Join-Path $root 'images/logos'
New-Item -ItemType Directory -Path $out -Force | Out-Null

$logos = [ordered]@{
    'soop.svg'        = 'https://i.namu.wiki/i/hn77aAPLGwewN-dxHCBvfFrxOapAYdN0DHk5GrcP9ZkO6GykjmlFb2OfCG0W-9cK3QSoAj-ngvLrazq2mQWgF54nqCrqYxLDwhg9cEmNqIxshIwdRRQ_WW_gl0ZoC9IRQpfH4qTnkftmYIAiX_7aYQ.svg'
    'best-bj.webp'    = 'https://i.namu.wiki/i/zjnTttdDe5DfSs-gWYSKF_PlMEj2hVix16S7-lFqNKCvilEbDknajjTyuhtuh-IMhes79V2BrwfBvSmxG0efcKeHijxxvKCGpfylrULB-IbqwLwbMnXA3b3Jxg-S6zN5xz4fbQswOoLhLyi5umoQvA.webp'
    'jongdalsae.webp' = 'https://i.namu.wiki/i/mE19knmMroEc_FIDUd6tT3UL2-1a8l2FEgSq80SravXwwC8LFoHH0MHslYNlH5Q75ioycK4Dvi5UTG5FT0WPeZ92NbmQiCG-Teb1aY5lILQV3jfiuKOJod6-EG2C9qViMn3lFSnu83Kw-35-1fbmMQ.webp'
    'vcompany.webp'   = 'https://i.namu.wiki/i/xX92a7ZhxcQwKKdr_vKT67xWchKxWA0mhiD6hZKA-g6LWLQRIEhrXycbPTfkR3_VyCODcAXYzZ51-RqUqXTYLD31Uea85DsCmflUGE2T0ZlbTID1fabha8ML_7Ul1qodUwT8xL4rPjAmWfWHuU4Yrw.webp'
    'gamchester.webp' = 'https://i.namu.wiki/i/I2_x1YqkhtpXHddKOq9xqMdNPpQNCKsdh2lKGZDEKZpewb5TyQmIYYGoZ61waNeJrxN6ekeBUGBClR2HKafpmY13OvSGuXEEofxy8p7Uhkk_QfSezQ1izpIi0-U0V39eAf2AL45x8iUn8rjIw6_mPA.webp'
    'gambasya.webp'   = 'https://i.namu.wiki/i/keD1SlPkMxCD8MW4HL-AJP0LXydiKNjzyv_bpsYVMwNu7M9zJtY9OHN96wPBTG9-Ri4mBV4WcFFWBESTMakLMuG1PoWEjAPb6_L8HmXve2pM7qXul-v9iIPwunNVdZaqHXcoggxI7Gls_xcvqhXScg.webp'
    'gamst.webp'      = 'https://i.namu.wiki/i/jsOvUIq7zCCv0jsZNP-1n1qgLGkSUg-pG83mhZy1-XqFJ3hbO1N_d8-aTehPyq0w9Hl4B7ON_a5plJ5TZgKG_996lvDsHlW765a9Yc9Zjcj1rQ1dZJYgjuN-2uMmMv-jveBvEEGPMSXwEIbLEo7V6A.webp'
    'yuyuuldda.webp'  = 'https://i.namu.wiki/i/eSFA-LuqXYbTj9DGmA4tsPrqWXizdUEuZ28EqhFT9KGkv-BxC_u8nI2v76qyPUjxO9zw4X4OIz_fFTyHqkDkqogkuvr8IXwSfj90B5z1dFHRf058OYvnblnFeoBLDdjGshdQqj9oWnMp7uIhO_UV4w.webp'
    'pongland.webp'   = 'https://i.namu.wiki/i/zK_nHxwPpov-luAgo69Zc2qonHhDqhCfJfIlDmjswpNdER7Gr6p_Vw0H4zh-NCTIA6HuxjjsyYxQc2h1AEsNrw5xUR67VV-6S5Ldx1a-Kl7LW25HmPPp0ThyOcKgJUmzFshhU2lGbh9gi0Ggbsg05A.webp'
    'gapjildan.webp'  = 'https://i.namu.wiki/i/p0yhQG5LTbFum0x7TJa8fU_8FdnK_tH3HwG1pqSz1aRophVQjQwNxk6mea3OQL0fSCtG5a7ZpoYT1cA9mwO6UdOyCttb_uE2DOO4yyJa9ENMEpHG3vHkzGt8i_ynJg4SrOINObAWokAAuQW5DbqZdA.webp'
    'macaotalk.svg'   = 'https://i.namu.wiki/i/HWsna0Hp04GU9hZuXGWN8Ar6XaYNLiyPKNLJzYRV_neJevuJ_F-oj4kicdG3rqHB0xfGuSPO3WS1rx7D7Mm1LPPPbiqqSp3WpCl045l60qC_nHcmeWeIF3Y1RtQIjFW6R7rfKiqyIosRlkh_PiXWHw.svg'
    'ronaworld.webp'  = 'https://i.namu.wiki/i/suZdqdPnGQqhPHVIA6bdKwg1XCFfHXNezgfqz8Lr2z62_Lz-ZcD8TkVwTjsTmQKmx-606w16SVKWZ2RAnOam7GwUALaClTDUXm3wBK9QPCme7QqQAkP2P8rEn-839aVvx1tFdYpzx_aEtKFnGq5u3w.webp'
    'ohamma.webp'     = 'https://i.namu.wiki/i/KVV5YDf14vOnXy9xcm8wbPgRWfBJekkgWbNN6GNJBa7wbzW6hcRQ4bm5j8RAjqMHzSdd6vmDoHDAdF2LvWpFsLuKfCj_hQg-KqApRVqRsM78DJ5WXmW9-8y9urWNEBgdDxsJtGVPoEpvtaZCVxyTOQ.webp'
    'mingchin.webp'   = 'https://i.namu.wiki/i/BCZqRsXTbCYkIwMg2AmLC0JMaKR5EIYV1qpmnQ2K3axnBN2SrI8U7BV1WfyNwLDLUB51rNZU_Tg3mbuuu6FYCadNmazm1GIipyMTVRlxvBLa2GKuRqd9rHpD2FLPcK-TmQuxG_kTHbnQIM4k7-ls4A.webp'
    'chungdong.webp'  = 'https://i.namu.wiki/i/kDfgFAYguKluOLm4NE-3hbnqDVw3DcOejY2B9_rWGau5n91LLyjI4X6eH8qIFmlLZ0CGDBcJ4ydlwphG7KQfSVuBNOLoA9gvfZDaPCA3skrHoGLTejrpbq3fsshL0pij8bHVAkJEZGXV8HtpYd0Wvg.webp'
    'jeonjaeng.svg'   = 'https://i.namu.wiki/i/8mSv_PPzJGgdb3uLC_Ge1E7bsZm0gGC07oqDFRIPOceh_D_QH2OuajRjWlFhZMDvICHB9bnmAUAHYjXupalsx4jtudxKBfW4RaMFpbnwXR6baR0ns3YnNV8Ibvip4EimtwRyiLIouBVOjk_8vPSRWA.svg'
    'yoyang.webp'     = 'https://i.namu.wiki/i/BDs2bBg23vc1Q-pzu218ELzKJtRVuQvvBiRChStJ21LXeXevUzvSmVIPx55av5GZgt_OrkSJpaniSBd4v-7_8V7WuDfzfjnBQGzxKzOC6MBeFFJIU6xZTh79wB7V4GYaxvGbsetCBBoBKWMBErUj1A.webp'
    'goraecity.webp'  = 'https://i.namu.wiki/i/KFV6A_MmAnPQDQJS0OJ0Titnc6rnMzE34tGCT7a55PZMk5VzUtF-F0992QTZ3kAlzSZvMoHxrkNym3FgdUFjiSFAmNy1QxagZ9WJ7xaK0Hp1VMM_zaxlOQiMuD7aI_z-WD1Zv28WQAennkyddTIZdg.webp'
    'yeombyeong.webp' = 'https://i.namu.wiki/i/65BW9LoWAUD7TW7U3nif9HAyolVJJK7G_lxA4lWWQqDWTo7cDGpTVngR4tU3hvvKTk1UHY2Jvpj1Q0PbCtnvXxPRPcvV8wclnlAdDxmfMFcsYZ-jMQjwUPNVivleDQGRa_sbW1OV76ZBe2YJAywgHA.webp'
    'fc24.svg'        = 'https://i.namu.wiki/i/9PfuaYi-vMXgL8lMbFAx9Eryi8cmTCsnUe5PgknY6M1e9TocjzhMJXz8imxRcYuRO4wMPWEoFF63t68fQQJp-jD94SHxyJ48rI90bIUHwfiSRPjQEDtSDhAhPfuhque0bMAwXwtMbziO5R5NLn2M1A.svg'
    'gamwak.webp'     = 'https://i.namu.wiki/i/sGNqjvcKEJuPeqv192xmA7uhJKgeLevZx8h_MN4xoD5YvbjdMk1YYOc-6Pp26isCMYPTAcvmbppxnSOO3jvi07LnJ-Nu40FNeFsUiMbEcgA9CzJfAGa-oEMJLt-pOB-1amKZqF9VDpqTnp3HdXCIYA.webp'
    'duaon.webp'      = 'https://i.namu.wiki/i/XLbQ_lYiE1KpCVviP18WvuR1Sdym3j9K7e2yVEvoob-WQFl8WeyYT_1Uq2H0j3KABiCqLzJAQ7xx_gVyp1gzP2lLYDL6p7SEe-MKwb3GiiNG4T4yasU6IK6jt2mNsAYkWijqcCWs8PVcJZFmRzYDIA.webp'
    'lol.webp'        = 'https://i.namu.wiki/i/DxmYdv2GT6_M4yJmV45M5yW2Iqp-cw3QaBL1-5uk34GuGqQr4vi-W7V_ez0ehKB163VJ_Kcq-CLAS6-2DdP-Z2wn4UMkCwO9LjanzzB2KQ_kt6-6Lv0Hf-U0cYwwOn6kJOHFdHiqbBzEfVU7KUSL-A.webp'
}

foreach ($entry in $logos.GetEnumerator()) {
    $dest = Join-Path $out $entry.Key
    Write-Host "Downloading $($entry.Key) ..."
    curl.exe -sL -A "Mozilla/5.0" $entry.Value -o $dest
    if (-not (Test-Path $dest) -or (Get-Item $dest).Length -lt 100) {
        throw "Failed to download $($entry.Key)"
    }
}

Write-Host "OK: $($logos.Count) wiki logos saved to $out" -ForegroundColor Green
