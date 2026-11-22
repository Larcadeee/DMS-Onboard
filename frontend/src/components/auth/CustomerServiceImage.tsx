import Image from "next/image";
import customerServiceImage from "../../../assets/images/customer_service.jpg";

export default function CustomerServiceImage() {
  return (
    <div className="relative aspect-[4/3] w-full max-w-[620px]">
      <Image
        src={customerServiceImage}
        alt="Customer service representative assisting a caller"
        fill
        priority
        sizes="(min-width: 1024px) 50vw, 620px"
        className="object-contain"
      />
    </div>
  );
}
