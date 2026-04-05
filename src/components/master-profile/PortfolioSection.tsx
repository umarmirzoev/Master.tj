import { useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Camera, Briefcase } from "lucide-react";

interface Props {
  portfolio: any[];
}

// Портфолио визуально показывает примеры завершённых работ мастера.
export default function MasterPortfolio({ portfolio }: Props) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  return (
    <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
      <Card>
        <CardContent className="p-5 sm:p-6">
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2 mb-4">
            <Camera className="w-5 h-5 text-primary" /> Примеры работ ({portfolio.length})
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {portfolio.map((item) => (
              <div
                key={item.id}
                className="group cursor-pointer rounded-xl overflow-hidden border border-border/50 bg-card hover:shadow-md transition-all"
                onClick={() => item.image_url && setSelectedImage(item.image_url)}
              >
                <div className="aspect-square bg-muted relative overflow-hidden">
                  {item.image_url ? (
                    <img
                      src={item.image_url}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Briefcase className="w-8 h-8 text-muted-foreground" />
                    </div>
                  )}
                </div>
                <div className="p-3">
                  <p className="text-sm font-medium text-foreground truncate">{item.title}</p>
                  {item.category && <p className="text-xs text-muted-foreground">{item.category}</p>}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Lightbox */}
      <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
        <DialogContent className="sm:max-w-2xl p-1">
          {selectedImage && (
            <img src={selectedImage} alt="Работа мастера" className="w-full h-auto rounded-lg" />
          )}
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
