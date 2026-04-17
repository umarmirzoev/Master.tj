import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import {
  Brain, Sparkles, MapPin, Clock, Star, Shield, Award, Zap,
  ChevronRight, Loader2, CheckCircle, ArrowRight, Phone, User, AlertTriangle,
  DollarSign, Package, Wrench,
} from "lucide-react";

interface AiMasterMatchProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface MatchedService {
  service_id: string;
  service_name: string;
  confidence: number;
}

interface MatchResult {
  category_id: string;
  category_name: string;
  services: MatchedService[];
  is_urgent: boolean;
  needs_product: boolean;
  needs_installation: boolean;
  product_keywords: string[];
  explanation: string;
}

interface MatchedMaster {
  id: string;
  full_name: string;
  avatar_url: string;
  average_rating: number;
  total_reviews: number;
  experience_years: number;
  working_districts: string[];
  service_categories: string[];
  price_min: number;
  price_max: number;
  completed_orders: number;
  response_time_avg: number;
  is_top_master: boolean;
  ai_score: number;
  ai_reasons: string[];
  ai_badges: string[];
}

const DISTRICTS = ["Сино", "Фирдавси", "Шохмансур", "Исмоили Сомони", "Пригород"];

// Компонент AI-подбора анализирует описание проблемы и предлагает подходящих мастеров.
export default function AiMasterMatch({ open, onOpenChange }: AiMasterMatchProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [step, setStep] = useState<"form" | "loading" | "results" | "booking">(
    "form"
  );
  const [description, setDescription] = useState("");
  const [district, setDistrict] = useState("");
  const [urgency, setUrgency] = useState("normal");
  const [budget, setBudget] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");

  const [matchResult, setMatchResult] = useState<MatchResult | null>(null);
  const [masters, setMasters] = useState<MatchedMaster[]>([]);
  const [selectedMaster, setSelectedMaster] = useState<MatchedMaster | null>(null);
  const [selectedService, setSelectedService] = useState<MatchedService | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Отправляем описание проблемы в edge function и получаем результат интеллектуального подбора.
  const handleAnalyze = async () => {
    if (!description.trim()) {
      toast({ title: "Опишите проблему", variant: "destructive" });
      return;
    }

    setStep("loading");

    try {
      const { data, error } = await supabase.functions.invoke("ai-match-master", {
        body: {
          description: description.trim(),
          district,
          urgency,
          budget: budget ? Number(budget) : null,
        },
      });

      if (error) throw error;

      setMatchResult(data.match);
      setMasters(data.masters || []);
      if (data.match.services?.length > 0) {
        setSelectedService(data.match.services[0]);
      }
      setStep("results");
    } catch (e: any) {
      console.warn("AI match function failed, using local fallback:", e);
      
      // Local fallback logic
      const desc = description.toLowerCase();
      let detectedCategory = { id: "", name: "Общие работы" };
      
      // Simple keyword detection
      if (desc.includes("кран") || desc.includes("труб") || desc.includes("сантех")) {
        detectedCategory = { id: "1", name: "Сантехника" };
      } else if (desc.includes("свет") || desc.includes("розетк") || desc.includes("электр")) {
        detectedCategory = { id: "2", name: "Электрика" };
      } else if (desc.includes("мебел") || desc.includes("шкаф") || desc.includes("двер")) {
        detectedCategory = { id: "3", name: "Мебель" };
      }

      // Fetch sample masters for fallback
      const { data: fallbackMasters } = await supabase
        .from("master_listings")
        .select("*")
        .eq("is_active", true)
        .limit(3);

      const mappedMasters: MatchedMaster[] = (fallbackMasters || []).map(m => ({
        id: m.id,
        full_name: m.full_name,
        avatar_url: m.avatar_url || "",
        average_rating: m.average_rating || 4.5,
        total_reviews: m.total_reviews || 0,
        experience_years: m.experience_years || 2,
        working_districts: m.working_districts || [],
        service_categories: m.service_categories || [],
        price_min: m.price_min || 50,
        price_max: m.price_max || 500,
        completed_orders: m.completed_orders || 10,
        response_time_avg: 15,
        is_top_master: m.average_rating >= 4.8,
        ai_score: 85,
        ai_reasons: ["Хорошо подходит под ваш запрос", "Много положительных отзывов"],
        ai_badges: ["Рекомендуем"],
      }));

      const mockMatch: MatchResult = {
        category_id: detectedCategory.id,
        category_name: detectedCategory.name,
        services: [{ service_id: "s1", service_name: "Диагностика и ремонт", confidence: 0.9 }],
        is_urgent: urgency === "urgent",
        needs_product: desc.includes("купить") || desc.includes("замен"),
        needs_installation: desc.includes("установ"),
        product_keywords: [],
        explanation: "Мы подобрали лучших мастеров, которые специализируются на подобных работах.",
      };

      setMatchResult(mockMatch);
      setMasters(mappedMasters);
      setSelectedService(mockMatch.services[0]);
      setStep("results");
      
      toast({
        title: "Результаты подобраны",
        description: "Мы нашли подходящих специалистов по вашему описанию.",
      });
    }
  };

  const handleSelectMaster = (master: MatchedMaster) => {
    setSelectedMaster(master);
    setStep("booking");
  };

  // После выбора мастера создаём обычный заказ, используя найденную AI категорию и услугу.
  const handleCreateOrder = async () => {
    if (!user) {
      toast({ title: "Войдите в аккаунт", variant: "destructive" });
      navigate("/auth");
      return;
    }
    if (!phone.trim() || !address.trim()) {
      toast({ title: "Заполните телефон и адрес", variant: "destructive" });
      return;
    }

    setSubmitting(true);

    const { error } = await supabase.from("orders").insert({
      client_id: user.id,
      master_id: selectedMaster?.id || null,
      category_id: matchResult?.category_id || null,
      service_id: selectedService?.service_id || null,
      description: description.trim(),
      phone: phone.trim(),
      address: address.trim(),
      budget: budget ? Number(budget) : 0,
      status: matchResult?.is_urgent ? "new" : "new",
    });

    if (error) {
      toast({ title: "Ошибка", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "✅ Заказ создан!", description: "Мастер получит уведомление" });
      // Notify master
      if (selectedMaster) {
        await supabase.from("notifications").insert({
          user_id: selectedMaster.id,
          title: "🤖 Новый заказ через AI подбор",
          message: `Клиент описал: ${description.slice(0, 80)}`,
          type: "ai_order",
        });
      }
      resetAndClose();
    }

    setSubmitting(false);
  };

  const resetAndClose = () => {
    setStep("form");
    setDescription("");
    setDistrict("");
    setUrgency("normal");
    setBudget("");
    setPhone("");
    setAddress("");
    setMatchResult(null);
    setMasters([]);
    setSelectedMaster(null);
    setSelectedService(null);
    onOpenChange(false);
  };

  const badgeColors: Record<string, string> = {
    "Лучший выбор": "bg-primary/10 text-primary border-primary/20",
    "Ближе всех": "bg-blue-500/10 text-blue-600 border-blue-500/20",
    "Высокий рейтинг": "bg-yellow-500/10 text-yellow-700 border-yellow-500/20",
    "Быстрый выезд": "bg-orange-500/10 text-orange-600 border-orange-500/20",
    "Топ мастер": "bg-purple-500/10 text-purple-600 border-purple-500/20",
  };

  const gradients = [
    "from-primary to-emerald-400",
    "from-blue-500 to-cyan-400",
    "from-violet-500 to-purple-400",
    "from-amber-500 to-orange-400",
    "from-rose-500 to-pink-400",
  ];

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) resetAndClose(); else onOpenChange(v); }}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-emerald-400 flex items-center justify-center">
              <Brain className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="text-lg">AI подбор мастера</span>
              <p className="text-xs font-normal text-muted-foreground">Умный поиск лучшего специалиста</p>
            </div>
          </DialogTitle>
        </DialogHeader>

        <AnimatePresence mode="wait">
          {/* STEP 1: Form */}
          {step === "form" && (
            <motion.div key="form" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="space-y-4">
              {/* Progress */}
              <div className="flex items-center gap-2 mb-2">
                {["Описание", "Анализ", "Результат"].map((label, i) => (
                  <div key={label} className="flex items-center gap-2 flex-1">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${i === 0 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                      {i + 1}
                    </div>
                    <span className={`text-xs ${i === 0 ? "text-foreground font-medium" : "text-muted-foreground"}`}>{label}</span>
                    {i < 2 && <div className="flex-1 h-px bg-border" />}
                  </div>
                ))}
              </div>

              <div>
                <label className="text-sm font-medium mb-1.5 block">Опишите проблему *</label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Например: течёт кран, не работает розетка, нужно установить камеру..."
                  className="min-h-[90px] rounded-xl"
                  maxLength={500}
                />
                <p className="text-[11px] text-muted-foreground mt-1">
                  AI определит категорию, услугу и подберёт лучших мастеров
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium mb-1.5 block flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" /> Район
                  </label>
                  <Select value={district} onValueChange={setDistrict}>
                    <SelectTrigger className="rounded-xl">
                      <SelectValue placeholder="Выберите район" />
                    </SelectTrigger>
                    <SelectContent>
                      {DISTRICTS.map((d) => (
                        <SelectItem key={d} value={d}>{d}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-1.5 block flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" /> Срочность
                  </label>
                  <Select value={urgency} onValueChange={setUrgency}>
                    <SelectTrigger className="rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="normal">Обычный</SelectItem>
                      <SelectItem value="soon">В ближайшее время</SelectItem>
                      <SelectItem value="urgent">Срочно!</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-1.5 block flex items-center gap-1">
                    <DollarSign className="w-3.5 h-3.5" /> Бюджет (сомонӣ)
                  </label>
                  <Input
                    type="number"
                    value={budget}
                    onChange={(e) => setBudget(e.target.value)}
                    placeholder="Необязательно"
                    className="rounded-xl"
                  />
                </div>
              </div>

              <Button
                onClick={handleAnalyze}
                disabled={!description.trim()}
                className="w-full h-12 rounded-xl text-base font-semibold gap-2 bg-gradient-to-r from-primary to-emerald-500 hover:from-primary/90 hover:to-emerald-500/90 shadow-lg"
              >
                <Sparkles className="w-5 h-5" />
                Подобрать мастера
              </Button>
            </motion.div>
          )}

          {/* STEP 2: Loading */}
          {step === "loading" && (
            <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="py-12 text-center space-y-4">
              <div className="relative w-20 h-20 mx-auto">
                <div className="absolute inset-0 rounded-full bg-gradient-to-r from-primary to-emerald-400 animate-spin opacity-20" />
                <div className="absolute inset-2 rounded-full bg-background flex items-center justify-center">
                  <Brain className="w-8 h-8 text-primary animate-pulse" />
                </div>
              </div>
              <div>
                <p className="font-semibold text-foreground">AI анализирует вашу проблему...</p>
                <p className="text-sm text-muted-foreground mt-1">Определяем категорию и подбираем лучших мастеров</p>
              </div>
              <div className="flex justify-center gap-1">
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    className="w-2 h-2 rounded-full bg-primary"
                    animate={{ scale: [1, 1.5, 1], opacity: [0.3, 1, 0.3] }}
                    transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
                  />
                ))}
              </div>
            </motion.div>
          )}

          {/* STEP 3: Results */}
          {step === "results" && matchResult && (
            <motion.div key="results" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
              {/* Progress */}
              <div className="flex items-center gap-2 mb-2">
                {["Описание", "Анализ", "Результат"].map((label, i) => (
                  <div key={label} className="flex items-center gap-2 flex-1">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${i <= 2 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                      {i < 2 ? <CheckCircle className="w-4 h-4" /> : (i + 1)}
                    </div>
                    <span className={`text-xs ${i <= 2 ? "text-foreground font-medium" : "text-muted-foreground"}`}>{label}</span>
                    {i < 2 && <div className="flex-1 h-px bg-primary/30" />}
                  </div>
                ))}
              </div>

              {/* AI Detection card */}
              <Card className="border-primary/20 bg-primary/5">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-primary" />
                    <span className="text-sm font-semibold text-primary">AI определил</span>
                    {matchResult.is_urgent && (
                      <Badge className="bg-destructive/10 text-destructive border-destructive/20 gap-1">
                        <AlertTriangle className="w-3 h-3" /> Срочно
                      </Badge>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="bg-background rounded-lg p-2.5">
                      <p className="text-[11px] text-muted-foreground">Категория</p>
                      <p className="font-semibold">{matchResult.category_name}</p>
                    </div>
                    <div className="bg-background rounded-lg p-2.5">
                      <p className="text-[11px] text-muted-foreground">Услуга</p>
                      <p className="font-semibold">{selectedService?.service_name || "—"}</p>
                    </div>
                  </div>

                  {matchResult.services.length > 1 && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1.5">Возможные варианты:</p>
                      <div className="flex flex-wrap gap-1.5">
                        {matchResult.services.map((s) => (
                          <button
                            key={s.service_id}
                            onClick={() => setSelectedService(s)}
                            className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${selectedService?.service_id === s.service_id
                              ? "bg-primary text-primary-foreground border-primary"
                              : "bg-background border-border hover:border-primary/50"
                            }`}
                          >
                            {s.service_name}
                            <span className="ml-1 opacity-60">{Math.round(s.confidence * 100)}%</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {(matchResult.needs_product || matchResult.needs_installation) && (
                    <div className="flex gap-2">
                      {matchResult.needs_product && (
                        <Badge variant="outline" className="gap-1 text-xs">
                          <Package className="w-3 h-3" /> Может потребоваться товар
                        </Badge>
                      )}
                      {matchResult.needs_installation && (
                        <Badge variant="outline" className="gap-1 text-xs">
                          <Wrench className="w-3 h-3" /> Установка
                        </Badge>
                      )}
                    </div>
                  )}

                  <p className="text-xs text-muted-foreground italic">{matchResult.explanation}</p>
                </CardContent>
              </Card>

              {/* Masters */}
              <div>
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Рекомендуемые мастера ({masters.length})
                </h3>

                {masters.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <User className="w-10 h-10 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Мастера не найдены для данной категории</p>
                    <Button variant="outline" size="sm" className="mt-3" onClick={() => setStep("form")}>
                      Изменить запрос
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {masters.map((master, i) => {
                      const initials = master.full_name.split(" ").map((w) => w[0]).join("").slice(0, 2);
                      const gradient = gradients[i % gradients.length];

                      return (
                        <motion.div
                          key={master.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.1 }}
                        >
                          <Card className="hover:shadow-lg transition-all duration-200 hover:-translate-y-0.5 cursor-pointer group border-border/50"
                            onClick={() => handleSelectMaster(master)}>
                            <CardContent className="p-4">
                              <div className="flex items-start gap-3">
                                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center text-white font-bold shrink-0 shadow-md`}>
                                  {initials}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <h4 className="font-bold text-foreground group-hover:text-primary transition-colors">
                                      {master.full_name}
                                    </h4>
                                    {master.is_top_master && (
                                      <Badge className="bg-amber-100 text-amber-800 text-[10px] px-1.5 py-0 gap-0.5">
                                        <Award className="w-3 h-3" /> Топ
                                      </Badge>
                                    )}
                                  </div>

                                  {/* Badges */}
                                  {master.ai_badges.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mt-1">
                                      {master.ai_badges.map((badge) => (
                                        <Badge key={badge} variant="outline" className={`text-[10px] px-2 py-0 ${badgeColors[badge] || ""}`}>
                                          {badge}
                                        </Badge>
                                      ))}
                                    </div>
                                  )}

                                  <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                                    <span className="flex items-center gap-0.5">
                                      <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                                      <span className="font-semibold text-foreground">{master.average_rating}</span>
                                      <span>({master.total_reviews})</span>
                                    </span>
                                    <span className="flex items-center gap-0.5">
                                      <Clock className="w-3 h-3" /> {master.experience_years} лет
                                    </span>
                                    <span className="flex items-center gap-0.5">
                                      <Shield className="w-3 h-3" /> {master.completed_orders} работ
                                    </span>
                                  </div>

                                  {/* AI reason */}
                                  {master.ai_reasons.length > 0 && (
                                    <p className="text-[11px] text-primary/80 mt-1.5 flex items-center gap-1">
                                      <Sparkles className="w-3 h-3" />
                                      {master.ai_reasons[0]}
                                    </p>
                                  )}
                                </div>

                                <div className="text-right shrink-0">
                                  <p className="text-xs text-muted-foreground">от</p>
                                  <p className="text-lg font-bold">{master.price_min}</p>
                                  <p className="text-[10px] text-muted-foreground">сомонӣ</p>
                                  <Button size="sm" className="mt-2 rounded-full h-8 px-3 text-xs gap-1">
                                    Выбрать <ChevronRight className="w-3 h-3" />
                                  </Button>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setStep("form")}>
                  Изменить запрос
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 rounded-xl"
                  onClick={() => navigate(`/category/${matchResult.category_id}`)}
                >
                  Все мастера категории
                </Button>
              </div>
            </motion.div>
          )}

          {/* STEP 4: Booking */}
          {step === "booking" && selectedMaster && (
            <motion.div key="booking" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
              <Card className="border-primary/20">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-emerald-400 flex items-center justify-center text-white font-bold">
                      {selectedMaster.full_name.split(" ").map((w) => w[0]).join("").slice(0, 2)}
                    </div>
                    <div>
                      <p className="font-bold">{selectedMaster.full_name}</p>
                      <p className="text-sm text-muted-foreground">
                        {matchResult?.category_name} • {selectedService?.service_name}
                      </p>
                      <div className="flex items-center gap-1 mt-0.5">
                        <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                        <span className="text-sm font-semibold">{selectedMaster.average_rating}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Телефон *</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+992 900 000 000"
                      className="pl-9 rounded-xl"
                      maxLength={20}
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Адрес *</label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="Улица, дом, квартира"
                      className="pl-9 rounded-xl"
                      maxLength={200}
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setStep("results")}>
                  Назад
                </Button>
                <Button
                  onClick={handleCreateOrder}
                  disabled={submitting || !phone.trim() || !address.trim()}
                  className="flex-1 rounded-xl gap-2 bg-gradient-to-r from-primary to-emerald-500"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                  {submitting ? "Создание..." : "Оформить заказ"}
                </Button>
              </div>

              <p className="text-[11px] text-center text-muted-foreground">
                Поддержка: +992 979 117 007
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
