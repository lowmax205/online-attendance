import { QrCode, ShieldCheck, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const iconMap = {
  scan: QrCode,
  verify: ShieldCheck,
  record: CheckCircle2,
};

interface StepCardProps {
  iconKey: keyof typeof iconMap;
  title: string;
  description: string;
}

export function StepCard({ iconKey, title, description }: StepCardProps) {
  const Icon = iconMap[iconKey];

  return (
    <Card className="relative overflow-hidden transition-all hover:shadow-lg">
      <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16" />
      <CardHeader>
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
          <Icon className="h-6 w-6 text-primary" />
        </div>
        <CardTitle className="text-xl">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {description}
        </p>
      </CardContent>
    </Card>
  );
}
