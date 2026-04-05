import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Upload } from "lucide-react";

const SERVICE_CATEGORIES = [
  "Электрика", "Сантехника", "Отделка", "Мебель и двери",
  "Умный дом", "Видеонаблюдение", "Сад и двор", "Сварка",
  "Подвалы и гаражи", "Клининг", "Ремонт под ключ",
  "Аварийные услуги 24/7", "Ремонт техники",
];

const DISTRICTS = ["Сино", "Фирдавси", "Шохмансур", "Исмоили Сомони", "Пригород"];

interface Props {
  onComplete: () => void;
  userId: string;
}

// Форма регистрации мастера собирает специализацию, опыт, районы и подтверждающие документы.
export default function MasterRegistrationFields({ onComplete, userId }: Props) {
  const [categories, setCategories] = useState<string[]>([]);
  const [experience, setExperience] = useState("");
  const [districts, setDistricts] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [documents, setDocuments] = useState<{ name: string; url: string }[]>([]);

  const toggleItem = (item: string, list: string[], setter: (v: string[]) => void) => {
    setter(list.includes(item) ? list.filter((i) => i !== item) : [...list, item]);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    const uploaded: { name: string; url: string }[] = [];
    for (const file of Array.from(files)) {
      const path = `${userId}/${Date.now()}_${file.name}`;
      const { error } = await supabase.storage.from("documents").upload(path, file);
      if (!error) {
        const { data } = supabase.storage.from("documents").getPublicUrl(path);
        uploaded.push({ name: file.name, url: data.publicUrl });
      }
    }
    setDocuments((prev) => [...prev, ...uploaded]);
    setUploading(false);
  };

  const handleSubmit = async () => {
    if (categories.length === 0 || !experience || districts.length === 0) return;
    setSubmitting(true);

    // Update profile with pending master data
    await supabase.from("profiles").update({
      service_categories: categories,
      experience_years: parseInt(experience),
      working_districts: districts,
      documents: documents,
      approval_status: "pending",
    }).eq("user_id", userId);

    // Create master application for admin review (do NOT add master role yet)
    await supabase.from("master_applications").insert({
      user_id: userId,
      full_name: "",
      phone: "",
      email: "",
      district: districts[0] || "",
      specialization: categories[0] || "",
      experience_years: parseInt(experience) || 0,
      description: `Категории: ${categories.join(", ")}. Районы: ${districts.join(", ")}`,
      status: "pending",
    });

    setSubmitting(false);
    onComplete();
  };

  return (
    <div className="space-y-5">
      <div>
        <Label className="text-sm font-medium mb-2 block">Категории услуг *</Label>
        <div className="grid grid-cols-2 gap-2">
          {SERVICE_CATEGORIES.map((cat) => (
            <label key={cat} className="flex items-center gap-2 text-sm cursor-pointer p-2 rounded-lg hover:bg-accent">
              <Checkbox checked={categories.includes(cat)} onCheckedChange={() => toggleItem(cat, categories, setCategories)} />
              {cat}
            </label>
          ))}
        </div>
      </div>

      <div>
        <Label className="text-sm font-medium mb-2 block">Опыт работы (лет) *</Label>
        <Input
          type="number"
          min={1}
          max={50}
          placeholder="5"
          value={experience}
          onChange={(e) => setExperience(e.target.value)}
        />
      </div>

      <div>
        <Label className="text-sm font-medium mb-2 block">Районы работы *</Label>
        <div className="flex flex-wrap gap-2">
          {DISTRICTS.map((d) => (
            <label key={d} className="flex items-center gap-2 text-sm cursor-pointer p-2 rounded-lg hover:bg-accent">
              <Checkbox checked={districts.includes(d)} onCheckedChange={() => toggleItem(d, districts, setDistricts)} />
              {d}
            </label>
          ))}
        </div>
      </div>

      <div>
        <Label className="text-sm font-medium mb-2 block">Документы (паспорт, сертификаты)</Label>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="rounded-full gap-2" asChild disabled={uploading}>
            <label>
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              Загрузить файлы
              <input type="file" multiple accept="image/*,.pdf" className="hidden" onChange={handleFileUpload} />
            </label>
          </Button>
        </div>
        {documents.length > 0 && (
          <div className="mt-2 space-y-1">
            {documents.map((doc, i) => (
              <p key={i} className="text-xs text-muted-foreground">📎 {doc.name}</p>
            ))}
          </div>
        )}
      </div>

      <Button
        onClick={handleSubmit}
        disabled={submitting || categories.length === 0 || !experience || districts.length === 0}
        className="w-full rounded-full"
      >
        {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
        Подать заявку мастером
      </Button>
    </div>
  );
}
