import { useParams, Navigate } from "react-router-dom";
import MasterProfile from "./MasterProfile";

// Эта страница просто переиспользует общий компонент полного профиля мастера.
export default function MasterDetail() {
  // Вся бизнес-логика уже находится в MasterProfile, а этот файл нужен как отдельный маршрут.
  return <MasterProfile />;
}
