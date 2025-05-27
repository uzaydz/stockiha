import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Image from "next/image";

export default function MapLocation() {
  return (
    <Card className="shadow-lg overflow-hidden">
      <CardHeader>
        <CardTitle className="text-2xl font-bold text-center">موقعنا</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {/* نستخدم صورة للخريطة كبديل لواجهة الخريطة التفاعلية */}
        <div className="relative h-[400px] w-full">
          <Image
            src="/images/map-location.jpg"
            alt="موقع بازار كونكت في الرياض"
            fill
            className="object-cover"
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="bg-primary text-white px-6 py-3 rounded-lg shadow-lg text-center max-w-xs">
              <h3 className="font-semibold text-lg mb-1">مقر بازار كونكت</h3>
              <p className="text-sm">برج المملكة، طريق الملك فهد، الرياض، المملكة العربية السعودية</p>
            </div>
          </div>
        </div>
        <div className="p-4 bg-muted/30">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              يمكنك زيارتنا خلال ساعات العمل الرسمية
            </p>
            <a
              href="https://maps.google.com/?q=Kingdom+Tower,+King+Fahd+Road,+Riyadh,+Saudi+Arabia"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline text-sm font-medium"
            >
              عرض في خرائط جوجل
            </a>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
