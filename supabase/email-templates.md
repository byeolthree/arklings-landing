# Supabase 이메일 문구 (한국어) — 미션7 단계 1

> **키 대기:** Supabase 키와 메일(네이버 SMTP) 설정이 끝나기 전에는 가입 확인 메일이 실제로 오지 않습니다. 설정 순서는 `supabase/mail-setup.md`에 있습니다. 설정이 끝나면 이 문서의 문구를 적용하고 가입을 한 번 시험해 주세요.

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

> 카카오처럼 이메일 없이 들어온 사람이 이메일을 입력하면 이 메일이 갑니다. 링크를 누르면 그 이메일이 계정에 확인된 이메일로 붙습니다.

## 3. Magic Link (로그인 링크) — 단계 4: 이미 있는 이메일로 이어주기 확인

제목: `[아클링스] 로그인 링크를 보내드려요`

```html
<h2 style="margin:0 0 12px;color:#2a2025">로그인 링크를 보내드려요</h2>
<p style="margin:0 0 16px;color:#574a50;line-height:1.6">
  아래 버튼을 누르면 아클링스에 로그인돼요. 소셜 로그인(카카오 등)을 이 계정에 이어 달라는 요청이 있었다면,
  로그인한 뒤 화면에서 직접 이어 줄지 한 번 더 물어봐요.
</p>
<p style="margin:0 0 20px">
  <a href="{{ .RedirectTo }}&token_hash={{ .TokenHash }}&type=magiclink"
     style="display:inline-block;background:#a61e5c;color:#ffffff;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:700">
    로그인하기
  </a>
</p>
<p style="margin:0;color:#8c8c8c;font-size:12px;line-height:1.6">
  요청한 적이 없다면 이 메일은 무시해 주세요. 링크를 누르지 않으면 아무 일도 일어나지 않아요.
</p>
```

## 4. Reset password (비밀번호 설정·재설정) — 단계 4

제목: `[아클링스] 비밀번호를 정해 주세요`

```html
<h2 style="margin:0 0 12px;color:#2a2025">비밀번호를 정해 주세요</h2>
<p style="margin:0 0 16px;color:#574a50;line-height:1.6">
  아래 버튼을 누르면 새 비밀번호를 정할 수 있어요. 구글·카카오로 가입한 계정도 이 링크로 비밀번호를 정하면
  이메일로 로그인할 수 있어요.
</p>
<p style="margin:0 0 20px">
  <a href="{{ .RedirectTo }}&token_hash={{ .TokenHash }}&type=recovery"
     style="display:inline-block;background:#a61e5c;color:#ffffff;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:700">
    비밀번호 정하기
  </a>
</p>
<p style="margin:0;color:#8c8c8c;font-size:12px;line-height:1.6">
  요청한 적이 없다면 이 메일은 무시해 주세요. 비밀번호는 바뀌지 않아요.
</p>
```

> 세 템플릿(2·3·4) 모두 링크 모양이 `{{ .RedirectTo }}&token_hash=…&type=…`로 같아야 `/auth/confirm`이 처리합니다.
> Supabase 화면의 Authentication → Emails(Email Templates)에서 각각 붙여 넣습니다.
