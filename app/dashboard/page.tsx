'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Calendar } from '../components/Calendar';
import { ChangePasswordModal } from '../components/ChangePasswordModal';

interface RawCheckIn {
  check_in_date: string;
  username: string;
}

interface DailyCheckIns {
  karl: boolean;
  chang: boolean;
}

interface CheckInMap {
  [date: string]: DailyCheckIns;
}

export default function Dashboard() {
  const router = useRouter();
  const [checkins, setCheckins] = useState<CheckInMap>({});
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentUser, setCurrentUser] = useState('');
  const [isFetching, setIsFetching] = useState(true);
  const [error, setError] = useState('');
  const [currentView, setCurrentView] = useState('calendar');
  const [showChangePassword, setShowChangePassword] = useState(false);

  useEffect(() => {
    // Check if user is logged in
    const cookies = document.cookie.split(';');
    const userCookie = cookies.find(cookie => cookie.trim().startsWith('USER_DATA='));
    if (!userCookie) {
      router.push('/');
    } else {
      const rawData = decodeURIComponent(userCookie.split('=', 2)[1]).split(';');
      const userData = {
        username: rawData[0].split('=')[1],
        password: rawData[1].split('=')[1],
      }
      setCurrentUser(userData.username);
    }
  }, [router]);

  const fetchCheckins = async (year: number, month: number) => {
    setIsFetching(true);
    try {
      const response = await fetch(`/api/checkins?year=${year}&month=${month}`);
      if (!response.ok) {
        if (response.status === 401) {
          router.push('/');
          return;
        }
        throw new Error('Failed to fetch check-ins');
      }
      const data = await response.json();

      // Transform array into map
      const checkInMap: CheckInMap = {};
      data.checkins.forEach((c: RawCheckIn) => {
        const date = c.check_in_date.split('T')[0];
        if (!checkInMap[date]) {
          checkInMap[date] = { karl: false, chang: false };
        }
        checkInMap[date][c.username.toLowerCase() as 'karl' | 'chang'] = true;
      });

      setCheckins(checkInMap);
    } catch (err) {
      setError('Failed to load check-ins');
      console.error(err);
    } finally {
      setIsFetching(false);
    }
  };

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
  };

  const isDateCheckedIn = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return checkins[dateStr]?.[currentUser.toLowerCase() as 'karl' | 'chang'] || false;
  };

  const handleCheckInToggle = async () => {
    setIsFetching(true);
    setError('');

    try {
      const dateStr = selectedDate.toISOString().split('T')[0];
      const isCheckedIn = isDateCheckedIn(selectedDate);

      const url = '/api/checkins' + (isCheckedIn ? `?date=${dateStr}` : '');
      const method = isCheckedIn ? 'DELETE' : 'POST';
      const body = isCheckedIn ? undefined : JSON.stringify({ date: dateStr });

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body,
      });

      if (!response.ok) {
        throw new Error('Failed to update check-in');
      }

      // Update local state
      setCheckins(prev => {
        const newCheckins = { ...prev };
        if (isCheckedIn) {
          if (newCheckins[dateStr]) {
            newCheckins[dateStr] = {
              ...newCheckins[dateStr],
              [currentUser.toLowerCase()]: false
            };
          }
        } else {
          newCheckins[dateStr] = {
            ...newCheckins[dateStr] || { karl: false, chang: false },
            [currentUser.toLowerCase()]: true
          };
        }
        return newCheckins;
      });
    } catch (err) {
      setError('Failed to update check-in');
      console.error(err);
    } finally {
      setIsFetching(false);
    }
  };

  const handleLogout = () => {
    document.cookie = 'USER_DATA=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT';
    router.push('/');
  };

  return (
    <div className="flex min-h-screen h-screen overflow-hidden">
      {/* Left Navigation - Static */}
      <nav className="w-64 bg-gray-100 border-r border-gray-200 p-6 flex flex-col h-full">
        <div className="flex-grow">
          <ul className="space-y-2">
            <li>
              <button
                onClick={() => setCurrentView('calendar')}
                className={`w-full text-left px-4 py-2 rounded-lg transition-colors font-semibold
                  ${currentView === 'calendar'
                    ? 'bg-gray-200 text-gray-900'
                    : 'text-gray-600 hover:bg-gray-200 hover:text-gray-900'
                  }`}
              >
                Calendar
              </button>
            </li>
          </ul>
        </div>
        <div className="space-y-2">
          <button
            onClick={() => setShowChangePassword(true)}
            className="w-full px-4 py-2 text-left text-gray-500 hover:text-gray-900 hover:bg-gray-200 rounded-lg transition-colors"
          >
            Change Password
          </button>
          <button
            onClick={handleLogout}
            className="w-full px-4 py-2 text-left text-gray-500 hover:text-gray-900 hover:bg-gray-200 rounded-lg transition-colors"
          >
            Logout
          </button>
        </div>
      </nav>

      {/* Main Content - Scrollable */}
      <main className="flex-grow overflow-y-auto">
        <div className="h-full w-full flex items-center justify-center">
          <div className="w-full max-w-3xl px-8">
            <Calendar
              checkins={checkins}
              selectedDate={selectedDate}
              onDateSelect={handleDateSelect}
              onNavigate={fetchCheckins}
              currentUser={currentUser}
            />
            <div className="mt-6 flex flex-col items-center gap-4">
              <button
                onClick={handleCheckInToggle}
                disabled={isFetching || selectedDate > new Date()}
                className={`
                  px-6 py-2 rounded-lg
                  ${isFetching ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-90'}
                  ${isDateCheckedIn(selectedDate)
                    ? 'bg-gray-700 hover:bg-gray-600'
                    : 'bg-gray-900 hover:bg-gray-800'
                  }
                  text-white font-medium transition-colors
                `}
              >
                {isFetching ? 'Please wait...' : (
                  isDateCheckedIn(selectedDate) ? 'Uncheck In' : 'Check In'
                )}
              </button>
              {error && <div className="text-red-500 text-center">{error}</div>}
            </div>
          </div>
        </div>
      </main>

      {showChangePassword && (
        <ChangePasswordModal onClose={() => setShowChangePassword(false)} />
      )}
    </div>
  );
}