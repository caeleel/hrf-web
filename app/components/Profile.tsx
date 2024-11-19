'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

interface ProfileProps {
  name: string;
  isSelected: boolean;
  onSelect: () => void;
}

function LoadingSpinner() {
  return (
    <div className="w-32 h-32 flex items-center justify-center">
      <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
    </div>
  );
}

export function Profile({
  name,
  isSelected,
  onSelect,
}: ProfileProps) {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isSelected && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isSelected]);

  const handleLogin = async () => {
    try {
      setIsLoading(true);
      setError('');

      const response = await fetch('/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: name,
          password,
        }),
      });

      if (response.ok) {
        router.push('/dashboard');
      } else {
        setError('Invalid credentials');
        setIsLoading(false);
        setTimeout(() => {
          inputRef.current?.focus();
          inputRef.current?.setSelectionRange(0, inputRef.current.value.length);
        }, 10)
      }
    } catch (err) {
      setError('An error occurred');
      console.error(err);
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div
      onClick={!isSelected ? onSelect : undefined}
      className={`cursor-pointer text-center ${!isSelected && 'transition-transform hover:scale-105'} w-32`}
    >
      <div className="w-32 h-32 pt-2 rounded-tl-xl rounded-br-xl border-2 border-primary text-primary flex items-center justify-center text-[64px]">
        {name[0]}
      </div>
      {!isSelected ? (
        <div className="mt-4">{name}</div>
      ) : (
        <>
          <div className="flex items-center mt-2">
            <input
              ref={inputRef}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleLogin();
                }
              }}
              placeholder="Password"
              className="w-32 px-2 pt-2 pb-1 placeholder-[rgba(255,255,255,0.5)] border-2 border-primary bg-primary text-base text-white focus:outline-none rounded-bl-xl"
            />
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleLogin();
              }}
              className="text-primary relative right-0.5 border-2 border-primary p-[7px] bg-primary hover:bg-white group rounded-r-xl"
            >
              <svg width="20" height="22" viewBox="0 0 20 22" xmlns="http://www.w3.org/2000/svg">
                <path className="fill-white group-hover:fill-primary" d="M9.38776 5.92308H0V11V16.0769H9.38776V22L20 11L9.38776 0V5.92308Z" />
              </svg>
            </button>
          </div>
          {error && <div className="text-primary text-sm mt-2">{error}</div>}
        </>
      )}
    </div>
  );
}
