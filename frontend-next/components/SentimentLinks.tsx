"use client";

export default function SentimentLinks() {
  return (
    <div className="w-full space-y-6 text-base">
      <p>
        <span className="font-semibold text-gray-800">Fxssi sentiment:</span>{" "}
        <a
          href="https://fxssi.com/tools/current-ratio?filter=XAUUSD"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:underline"
        >
          https://fxssi.com/tools/current-ratio?filter=XAUUSD
        </a>
      </p>

      <p>
        <span className="font-semibold text-gray-800">MyFxbook sentiment:</span>{" "}
        <a
          href="https://www.myfxbook.com/community/outlook/XAUUSD"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:underline"
        >
          https://www.myfxbook.com/community/outlook/XAUUSD
        </a>
      </p>

      <p>
        <span className="font-semibold text-gray-800">Forexfactory sentiment:</span>{" "}
        <a
          href="https://www.forexfactory.com/trades"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:underline"
        >
          https://www.forexfactory.com/trades
        </a>
      </p>
    </div>
  );
}
