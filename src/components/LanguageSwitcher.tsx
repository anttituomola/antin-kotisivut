import { GB, FI } from "country-flag-icons/react/3x2";

interface LanguageSwitcherProps {
  currentLanguage: string;
  translationUrl?: string;
  minimal?: boolean;
}

export default function LanguageSwitcher({
  currentLanguage,
  translationUrl,
  minimal = false,
}: LanguageSwitcherProps) {
  if (!translationUrl) return null;

  if (minimal) {
    return (
      <div className="flex gap-2">
        <a
          href={currentLanguage === "fi" ? translationUrl : "#"}
          className={`${
            currentLanguage === "en"
              ? "font-bold"
              : "opacity-50 hover:opacity-100"
          }`}
        >
          <GB className="w-6 h-4" />
        </a>
        <a
          href={currentLanguage === "en" ? translationUrl : "#"}
          className={`${
            currentLanguage === "fi"
              ? "font-bold"
              : "opacity-50 hover:opacity-100"
          }`}
        >
          <FI className="w-6 h-4" />
        </a>
      </div>
    );
  }

  return (
    <div className="my-4">
      <a
        href={translationUrl}
        className="inline-flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-full hover:bg-accent/80 transition-colors"
      >
        {currentLanguage === "fi" ? (
          <>
            Read this post in English <GB className="w-6 h-4" />
          </>
        ) : (
          <>
            Lue tämä teksti suomeksi <FI className="w-6 h-4" />
          </>
        )}
      </a>
    </div>
  );
}
