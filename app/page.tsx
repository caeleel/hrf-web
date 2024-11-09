import Image from "next/image";

export default function Home() {
  return (
    <div className="h-[100svh] flex flex-col justify-end gap-6 p-16">
      <div className="absolute top-0 left-0 right-0 bottom-16 flex justify-center items-center">
        <Image
          src="/logo.svg"
          alt="HRF logo"
          width={242}
          height={225}
        />
      </div>
      <div className="flex flex-col gap-2 z-10">
        <div className="text-right text-sm">
          Bringing projects to life through code / physical media
        </div>
        <div className="text-right text-sm">
          For business inquiries, please contact us <a className="underline" href="mailto:karl@hurtrightfeet.com">here</a>
        </div>
      </div>
    </div>
  );
}
