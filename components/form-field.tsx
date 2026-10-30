// 가입·로그인·마이페이지 화면이 같이 쓰는 입력 칸 모양(협업 신청 폼과 같은 색·모서리).
export const authInputCls =
  "h-10 w-full rounded-lg border border-[#e8dfe3] bg-[#faf7f8] px-[11px] text-[13px] font-medium text-[#292126] outline-none placeholder:text-[#8c8c8c] focus:border-jaju disabled:opacity-60 aria-invalid:border-destructive md:h-11";

export function FormField({
  id,
  label,
  hint,
  error,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5 md:gap-2">
      <label htmlFor={id} className="text-[12px] font-medium text-[#292126] md:text-[13px]">
        {label}
      </label>
      {children}
      {hint && !error && <p className="text-[12px] text-[#8c8c8c] md:text-[13px]">{hint}</p>}
      {error && (
        <p id={`${id}-error`} role="alert" className="text-[12px] text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
