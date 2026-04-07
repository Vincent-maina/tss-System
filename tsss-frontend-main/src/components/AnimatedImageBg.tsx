import teacher1 from "@/assets/teacher1.jpg";
import teacher2 from "@/assets/teacher2.jpg";
import teacher3 from "@/assets/teacher3.jpg";
import teacher4 from "@/assets/teacher4.jpg";

const images = [teacher1, teacher2, teacher3, teacher4];

interface AnimatedImageBgProps {
  overlay?: string;
}

const AnimatedImageBg = ({ overlay = "bg-primary/70" }: AnimatedImageBgProps) => {
  return (
    <div className="absolute inset-0 overflow-hidden">
      {images.map((src, i) => (
        <img
          key={i}
          src={src}
          alt=""
          className="absolute inset-0 w-full h-full object-cover animate-slideshow animate-kenburns"
          style={{
            animationDelay: `${i * 5}s`,
            opacity: i === 0 ? 1 : 0,
          }}
        />
      ))}
      <div className={`absolute inset-0 ${overlay}`} />
      <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/40" />
    </div>
  );
};

export default AnimatedImageBg;
