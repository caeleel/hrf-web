'use client';
import Image from "next/image";
import { useRouter } from 'next/navigation';
import { Lacquer, Bebas_Neue } from "next/font/google";
import { useEffect, useState } from 'react';
import { Profile } from './components/Profile';

const lacquer = Lacquer({
  weight: '400',
  subsets: ['latin'],
});

const bebasNeue = Bebas_Neue({
  weight: '400',
  subsets: ['latin'],
});

const USERS = ['Chang', 'Karl'] as const;

export default function Home() {
  const router = useRouter();
  const [showLogin, setShowLogin] = useState(false);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);

  useEffect(() => {
    // Check for existing login
    const cookies = document.cookie.split(';');
    const userCookie = cookies.find(cookie => cookie.trim().startsWith('USER_DATA='));
    if (userCookie) {
      router.push('/dashboard');
    }
  }, [router]);

  return (
    <div className="h-[100svh] flex flex-col justify-end gap-6 p-16">
      <div className="absolute top-0 left-0 right-0 bottom-16 flex justify-center items-center">
        <div className="flex flex-col items-center gap-8">
          {!showLogin && (
            <div onClick={() => setShowLogin(true)} className="cursor-pointer">
              <Image
                src="/logo.svg"
                alt="HRF logo"
                width={242}
                height={225}
              />
            </div>
          )}
          {showLogin && (
            <div className={`${bebasNeue.className} flex gap-12`}>
              {USERS.map(name => (
                <div className="w-[10rem] h-[10rem]" key={name}>
                  <Profile
                    name={name}
                    isSelected={selectedUser === name}
                    onSelect={() => setSelectedUser(name)}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <div className={`${lacquer.className} flex flex-col gap-2 z-10`}>
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
