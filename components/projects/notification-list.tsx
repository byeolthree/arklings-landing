import { markAllNotificationsRead, openNotification } from "@/app/actions/notifications";
import type { NotificationRow } from "@/lib/notifications";
import { formatKst } from "@/lib/time";
import "../creators/creators.css";
import "./projects.css";

// 알림 목록(/notifications). 알림을 누르면 읽음 처리한 뒤 그 알림의 주소로 이동하고(openNotification), 「모두 읽음」은 안 읽은 알림을 한꺼번에 읽음으로 한다.
// 자바스크립트가 없어도 폼으로 동작한다.
export function NotificationList({ rows }: { rows: NotificationRow[] | null }) {
  const unread = rows ? rows.filter((r) => r.readAt === null).length : 0;
  return (
    <div className="cr pj">
      <section className="cr-top">
        <div className="wrap">
          <h1 className="cr-title">알림</h1>
          <p className="cr-desc">프로젝트 지원과 결과 소식을 모아 보여 드려요.</p>
        </div>
      </section>
      <section className="cr-list">
        <div className="wrap pj-formwrap pj-listwrap">
          {rows === null ? (
            <div className="panel cr-state" role="alert">
              <h2>알림을 불러오지 못했어요</h2>
              <p>잠시 뒤에 다시 열어 주세요.</p>
            </div>
          ) : rows.length === 0 ? (
            <div className="panel cr-state">
              <h2>받은 알림이 없어요</h2>
              <p>프로젝트에 지원하거나 지원을 받으면 여기에 알림이 와요.</p>
            </div>
          ) : (
            <>
              <div className="pj-noti-head">
                <p className="pj-count">
                  읽지 않은 알림 <b>{unread}</b>개
                </p>
                {unread > 0 && (
                  <form action={markAllNotificationsRead}>
                    <button type="submit" className="btn btn-ghost">
                      모두 읽음
                    </button>
                  </form>
                )}
              </div>
              <ul className="pj-rows">
                {rows.map((r) => (
                  <li key={r.id}>
                    <form action={openNotification} className="panel pj-noti-form">
                      <input type="hidden" name="notification_id" value={r.id} />
                      <button type="submit" className={`pj-noti${r.readAt === null ? " unread" : ""}`}>
                        <span className="pj-noti-dot" aria-hidden="true" />
                        <span className="pj-noti-body">
                          <span className="pj-noti-text">{r.body}</span>
                          <span className="pj-row-sub">
                            {formatKst(r.createdAt)}
                            {r.readAt === null ? " · 읽지 않음" : ""}
                          </span>
                        </span>
                      </button>
                    </form>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
