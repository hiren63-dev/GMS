import { useState } from 'react';
import { LogOut, AlertCircle } from 'lucide-react';

interface AdminDashboardProps {
  loginLogs: any[];
  checkIns: any[];
  employees: any[];
}

export default function AdminDashboard({ loginLogs, checkIns, employees }: AdminDashboardProps) {
  const [filterDept, setFilterDept] = useState<string>('');

  const getEmployeeCheckIn = (empId: string) => {
    return checkIns.find(c => c.employeeId === empId && new Date(c.date).toDateString() === new Date().toDateString());
  };

  const getLoginLog = (empId: string) => {
    return loginLogs.find(l => l.employeeId === empId && l.date === new Date().toISOString().split('T')[0]);
  };

  const filteredEmployees = filterDept ? employees.filter(e => e.department === filterDept) : employees;

  const moodCounts = {
    good: checkIns.filter((c: any) => c.responses?.mood === 'good').length,
    okay: checkIns.filter((c: any) => c.responses?.mood === 'okay').length,
    rough: checkIns.filter((c: any) => c.responses?.mood === 'rough').length,
  };

  const problemCount = checkIns.filter((c: any) => c.responses?.hasProblems).length;

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="text-2xl font-bold text-green-600">{moodCounts.good}</div>
          <div className="text-xs text-gray-600">Feeling Good 😊</div>
        </div>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="text-2xl font-bold text-yellow-600">{moodCounts.okay}</div>
          <div className="text-xs text-gray-600">Okay 😐</div>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="text-2xl font-bold text-red-600">{moodCounts.rough}</div>
          <div className="text-xs text-gray-600">Rough Day 😟</div>
        </div>
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <div className="text-2xl font-bold text-orange-600">{problemCount}</div>
          <div className="text-xs text-gray-600">Issues 🚨</div>
        </div>
      </div>

      {/* Filter */}
      <div>
        <select
          value={filterDept}
          onChange={(e) => setFilterDept(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="">All Departments</option>
          <option value="Tech">Tech</option>
          <option value="Marketing">Marketing</option>
          <option value="Operations">Operations</option>
          <option value="Sales">Sales</option>
          <option value="CEO">CEO</option>
          <option value="CFO">CFO</option>
          <option value="CMO">CMO</option>
        </select>
      </div>

      {/* Table */}
      <div className="overflow-x-auto border rounded-lg">
        <table className="w-full text-sm">
          <thead className="bg-gray-100 border-b">
            <tr>
              <th className="px-4 py-3 text-left font-semibold">Employee</th>
              <th className="px-4 py-3 text-left font-semibold">Login Time</th>
              <th className="px-4 py-3 text-left font-semibold">Status</th>
              <th className="px-4 py-3 text-left font-semibold">Mood</th>
              <th className="px-4 py-3 text-left font-semibold">Work</th>
              <th className="px-4 py-3 text-left font-semibold">Issues</th>
            </tr>
          </thead>
          <tbody>
            {filteredEmployees.map(emp => {
              const login = getLoginLog(emp.id);
              const checkIn = getEmployeeCheckIn(emp.id);

              return (
                <tr key={emp.id} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="font-medium">{emp.name}</div>
                    <div className="text-xs text-gray-500">{emp.department}</div>
                  </td>
                  <td className="px-4 py-3">
                    {login ? new Date(login.loginTime).toLocaleTimeString() : '—'}
                  </td>
                  <td className="px-4 py-3">
                    {login && !login.logoutTime ? (
                      <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">Online</span>
                    ) : login?.logoutTime ? (
                      <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">Offline</span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {checkIn?.responses?.mood === 'good' && '😊'}
                    {checkIn?.responses?.mood === 'okay' && '😐'}
                    {checkIn?.responses?.mood === 'rough' && '😟'}
                    {!checkIn && '—'}
                  </td>
                  <td className="px-4 py-3 max-w-xs">
                    {checkIn?.responses?.workDone ? (
                      <span className="line-clamp-2">{checkIn.responses.workDone}</span>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {checkIn?.responses?.hasProblems ? (
                      <AlertCircle className="text-red-500" size={18} />
                    ) : (
                      '—'
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
