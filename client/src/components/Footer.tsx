import { Link } from "wouter";

const LOGO_URL = "/manus-storage/logo_nobg_4a51d334.png";

export default function Footer() {
  return (
    <footer className="bg-primary text-primary-foreground">
      <div className="container py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Brand */}
          <div className="space-y-4">
            <Link href="/" className="flex items-center gap-2">
              <img src={LOGO_URL} alt="닉스의 스몰톡" className="h-10 w-auto brightness-0 invert" />
            </Link>
            <p className="text-sm text-primary-foreground/70 leading-relaxed">
              투자의 본질을 이야기합니다.<br />
              닉스의 스몰톡에서 더 나은 투자 인사이트를 만나보세요.
            </p>
          </div>

          {/* Links */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm tracking-wide uppercase">바로가기</h3>
            <ul className="space-y-2.5">
              <li>
                <Link href="/contents" className="text-sm text-primary-foreground/70 hover:text-primary-foreground transition-colors">
                  콘텐츠
                </Link>
              </li>
              <li>
                <Link href="/pricing" className="text-sm text-primary-foreground/70 hover:text-primary-foreground transition-colors">
                  구독 안내
                </Link>
              </li>
              <li>
                <Link href="/search" className="text-sm text-primary-foreground/70 hover:text-primary-foreground transition-colors">
                  검색
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm tracking-wide uppercase">고객지원</h3>
            <ul className="space-y-2.5">
              <li className="text-sm text-primary-foreground/70">
                문의: 채팅 상담 (우측 하단)
              </li>
              <li className="text-sm text-primary-foreground/70">
                운영시간: 평일 10:00 - 18:00
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-primary-foreground/10 mt-10 pt-6 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-xs text-primary-foreground/50">
            &copy; {new Date().getFullYear()} 닉스의 스몰톡. All rights reserved.
          </p>
          <div className="flex gap-4">
            <Link href="/terms" className="text-xs text-primary-foreground/50 hover:text-primary-foreground/70 transition-colors">
              이용약관
            </Link>
            <Link href="/privacy" className="text-xs text-primary-foreground/50 hover:text-primary-foreground/70 transition-colors">
              개인정보처리방침
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
