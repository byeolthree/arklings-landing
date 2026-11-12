// 모델 호출이 실패했을 때 화면에 보일 종류로 나눈다(교재 10-3·10-4: 401·429·시간 초과를 서로 다른 실패로 읽는다).
// 키와 사용자 글 원문은 화면과 로그에 내보내지 않는다. 여기서는 종류와 상태 코드만 다룬다.
import { APICallError, LoadAPIKeyError, LoadSettingError } from "ai";

export type AiFailCode = "auth" | "busy" | "retry" | "schema";

export function classifyAiError(e: unknown): { code: AiFailCode; status?: number } {
  if (APICallError.isInstance(e)) {
    const status = e.statusCode;
    const body = (e.responseBody ?? "").slice(0, 600);
    // 429는 「잠시 몰림」과 「잔액·사용 한도 초과」가 다르다. 한도 초과는 기다려도 풀리지 않으므로 연결 문제로 안내한다.
    if (status === 429) return { code: /insufficient_quota|spend_limit|billing|quota/i.test(body) ? "auth" : "busy", status };
    if (status === 401 || status === 403 || status === 404) return { code: "auth", status };
    return { code: "retry", status };
  }
  if (LoadAPIKeyError.isInstance(e) || LoadSettingError.isInstance(e)) return { code: "auth" };
  const name = e && typeof e === "object" && "name" in e ? String((e as { name: unknown }).name) : "";
  if (/Timeout|Abort/i.test(name)) return { code: "retry" };
  if (/NoObjectGenerated|NoOutputGenerated|JSONParse|TypeValidation|InvalidResponseData|NoContentGenerated/i.test(name)) return { code: "schema" };
  return { code: "retry" };
}
