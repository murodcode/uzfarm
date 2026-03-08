import { motion } from "framer-motion";
import AnimalCard from "@/components/AnimalCard";
import { ANIMAL_TYPES, OwnedAnimal, FIELD_NAMES, FIELD_EMOJIS, FIELD_PRICES, getFieldMaxOwned, countAnimalsByTypeInField } from "@/lib/gameData";
import { Lock, ShoppingBag } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface FieldViewProps {
  fieldNumber: number;
  animals: OwnedAnimal[];
  allAnimals: OwnedAnimal[];
  isUnlocked: boolean;
  cash: number;
  onUnlock: () => void;
  onFeed: (id: string) => void;
  onCollect: (id: string) => void;
  onCollectMilk: (id: string) => void;
  onSlaughter: (id: string) => void;
}

export default function FieldView({
  fieldNumber, animals, allAnimals, isUnlocked, coins, onUnlock,
  onFeed, onCollect, onCollectMilk, onSlaughter,
}: FieldViewProps) {
  const navigate = useNavigate();
  const price = FIELD_PRICES[fieldNumber];

  if (!isUnlocked) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="farm-card flex flex-col items-center py-12 text-center"
      >
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
          <Lock className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-black text-foreground mb-1">
          {FIELD_EMOJIS[fieldNumber]} {FIELD_NAMES[fieldNumber]}
        </h3>
        <p className="text-sm text-muted-foreground mb-1">
          {fieldNumber}x hayvon sig'imi
        </p>
        <p className="text-sm font-bold text-primary mb-4">
          💵 {price?.toLocaleString()} pul
        </p>
        <button
          onClick={onUnlock}
          disabled={coins < (price ?? Infinity)}
          className={`flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-bold transition-transform active:scale-95 ${
            coins >= (price ?? Infinity)
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground cursor-not-allowed"
          }`}
        >
          <Lock className="h-4 w-4" />
          {coins >= (price ?? Infinity) ? "Ochish" : "Mablag' yetarli emas"}
        </button>
      </motion.div>
    );
  }

  // Group animals by type
  const groupedAnimals = ANIMAL_TYPES
    .map(type => ({
      type,
      animals: animals.filter(a => a.typeId === type.id),
      maxForField: getFieldMaxOwned(type, fieldNumber),
      currentCount: countAnimalsByTypeInField(allAnimals, type.id, fieldNumber),
    }))
    .filter(group => group.animals.length > 0);

  return (
    <div className="space-y-4">
      {/* Field header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div className="flex items-center gap-2">
          <span className="text-base">{FIELD_EMOJIS[fieldNumber]}</span>
          <h2 className="text-sm font-black text-foreground">{FIELD_NAMES[fieldNumber]}</h2>
          <span className="text-xs font-bold text-muted-foreground">
            ({animals.length} ta hayvon)
          </span>
        </div>
        <button
          onClick={() => navigate(`/shop?field=${fieldNumber}`)}
          className="flex items-center gap-1.5 rounded-xl bg-secondary/15 border border-secondary/30 px-3 py-1.5 text-xs font-bold text-secondary transition-transform active:scale-95"
        >
          <ShoppingBag className="h-3.5 w-3.5" />
          Do'kon
        </button>
      </motion.div>

      {/* Capacity info */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex flex-wrap gap-1.5"
      >
        {ANIMAL_TYPES.map(type => {
          const count = countAnimalsByTypeInField(allAnimals, type.id, fieldNumber);
          const max = getFieldMaxOwned(type, fieldNumber);
          return (
            <span key={type.id} className="text-[10px] font-bold bg-muted rounded-full px-2 py-0.5 text-muted-foreground">
              {type.emoji} {count}/{max}
            </span>
          );
        })}
      </motion.div>

      {animals.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="farm-card flex flex-col items-center py-8 text-center"
        >
          <span className="text-4xl mb-2">{FIELD_EMOJIS[fieldNumber]}</span>
          <h3 className="text-base font-black text-foreground mb-1">Maydon bo'sh</h3>
          <p className="text-sm text-muted-foreground mb-3">
            Do'kondan hayvon sotib oling!
          </p>
          <button
            onClick={() => navigate(`/shop?field=${fieldNumber}`)}
            className="btn-farm text-sm"
          >
            🛒 Do'konga o'tish
          </button>
        </motion.div>
      ) : (
        groupedAnimals.map((group, gi) => (
          <motion.div
            key={group.type.id}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: gi * 0.05 }}
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">{group.type.emoji}</span>
              <h3 className="text-sm font-black text-foreground">{group.type.name}</h3>
              <span className="text-xs font-bold bg-primary/10 text-primary rounded-full px-2 py-0.5">
                {group.animals.length}/{group.maxForField}
              </span>
            </div>

            {group.animals.length === 1 ? (
              <AnimalCard
                animal={group.animals[0]}
                onFeed={() => onFeed(group.animals[0].id)}
                onCollect={() => onCollect(group.animals[0].id)}
                onCollectMilk={() => onCollectMilk(group.animals[0].id)}
                onSlaughter={() => onSlaughter(group.animals[0].id)}
              />
            ) : (
              <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1" style={{ scrollSnapType: 'x mandatory' }}>
                {group.animals.map((animal) => (
                  <div
                    key={animal.id}
                    className="flex-shrink-0 w-[85vw] max-w-[320px]"
                    style={{ scrollSnapAlign: 'start' }}
                  >
                    <AnimalCard
                      animal={animal}
                      onFeed={() => onFeed(animal.id)}
                      onCollect={() => onCollect(animal.id)}
                      onCollectMilk={() => onCollectMilk(animal.id)}
                      onSlaughter={() => onSlaughter(animal.id)}
                    />
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        ))
      )}
    </div>
  );
}
