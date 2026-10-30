# Supabase 이메일 문구 (한국어) — 미션7 단계 1

> **키 대기:** Supabase 키와 메일(Gmail SMTP) 설정이 끝나기 전에는 가입 확인 메일이 실제로 오지 않습니다. 설정이 끝나면 이 문서의 순서대로 적용하고 가입을 한 번 시험해 주세요.

Supabase 화면 → Authentication → Emails(Email Templates)에서 아래 문구로 바꿉니다.
링크는 반드시 `{{ .RedirectTo }}&token_hash={{ .TokenHash }}&type=...` 모양이어야 합니다.
(`{{ .RedirectTo }}`는 앱이 가입할 때 넘기는 `…/auth/confirm?next=…` 주소입니다. 메일을 다른 기기에서 열어도 동작합니다.)

돌아올 주소 허용 목록(Authentication → URL Configuration → Redirect URLs)에는 아래 두 개를 넣습니다.

- `http://localhost:3000/**`
- `https://<배포 주소>/**`

## 1. Confirm signup (가입 확인)

제목: `[아클링스] 이메일 확인을 부탁드려요`

```html
<h2 style="margin:0 0 12px;color:#2a2025">이메일 확인을 부탁드려요</h2>
<p style="margin:0 0 16px;color:#574a50;line-height:1.6">
  아클링스에 가입해 주셔서 고마워요. 아래 버튼을 누르면 가입이 끝나고 바로 로그인돼요.
</p>
<p style="margin:0 0 20px">
  <a href="{{ .RedirectTo }}&token_hash={{ .TokenHash }}&type=signup"
     style="display:inline-block;background:#a61e5c;color:#ffffff;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:700">
    이메일 확인하기
  </a>
</p>
<p style="margin:0 0 8px;color:#8c8c8c;font-size:12px;line-height:1.6">
  버튼이 눌리지 않으면 아래 주소를 브라우저에 붙여 넣어 주세요.<br />
  {{ .RedirectTo }}&amp;token_hash={{ .TokenHash }}&amp;type=signup
</p>
<p style="margin:0;color:#8c8c8c;font-size:12px;line-height:1.6">
  가입하신 적이 없다면 이 메일은 무시해 주세요. 링크는 일정 시간이 지나면 만료돼요.
</p>
```

## 2. Change email address (이메일 변경 확인) — 단계 4(카카오 이메일 확인)에서 사용

제목: `[아클링스] 이 이메일 주소를 확인해 주세요`

```html
<h2 style="margin:0 0 12px;color:#2a2025">이 이메일 주소를 확인해 주세요</h2>
<p style="margin:0 0 16px;color:#574a50;line-height:1.6">
  아클링스 계정에 {{ .NewEmail }} 주소를 연결하려고 해요. 본인이 맞다면 아래 버튼을 눌러 주세요.
</p>
<p style="margin:0 0 20px">
  <a href="{{ .RedirectTo }}&token_hash={{ .TokenHash }}&type=email_change"
     style="display:inline-block;background:#a61e5c;color:#ffffff;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:700">
    이메일 확인하기
  </a>
</p>
<p style="margin:0;color:#8c8c8c;font-size:12px;line-height:1.6">
  요청한 적이 없다면 이 메일은 무시해 주세요.
</p>
```

> 이 템플릿은 단계 4에서 실제 흐름을 시험하면서 문구와 링크 모양을 한 번 더 확인합니다.
