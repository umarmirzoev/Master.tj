import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { User } from "lucide-react";

interface Props {
  master: any;
}

// Блок "О мастере" показывает биографию специалиста или генерирует описание по его данным.
export default function MasterAbout({ master }: Props) {
  const bio = master.bio || generateDefaultBio(master);

  return (
    <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
      <Card>
        <CardContent className="p-5 sm:p-6">
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2 mb-3">
            <User className="w-5 h-5 text-primary" /> О мастере
          </h2>
          <p className="text-muted-foreground leading-relaxed whitespace-pre-line">{bio}</p>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function generateDefaultBio(master: any): string {
  const name = master.full_name?.split(" ")[0] || "Мастер";
  const cats = master.service_categories?.join(", ") || "ремонт";
  const years = master.experience_years || 3;
  const districts = master.working_districts?.join(", ") || "Душанбе";

  return `${name} — таҷрибадор ва боэътимод мутахассис дар соҳаи ${cats} дар шаҳри Душанбе. Зиёда аз ${years} сол таҷрибаи корӣ дорад.

Ба сифати кор ва қаноатмандии мизоҷон диққати махсус медиҳад. Кор дар ноҳияҳои ${districts}.

Барои машварат ва сафориш бо мо тамос гиред — кори сифатнок кафолат дода мешавад!`;
}
