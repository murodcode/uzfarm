import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function TelegramBackButton() {
  const navigate = useNavigate();

  useEffect(() => {
    const tg = (window as any).Telegram?.WebApp;
    if (!tg?.BackButton) return;

    tg.BackButton.show();
    const handler = () => navigate(-1);
    tg.BackButton.onClick(handler);

    return () => {
      tg.BackButton.offClick(handler);
      tg.BackButton.hide();
    };
  }, [navigate]);

  return null;
}
