import { X, Users } from 'lucide-react';
import { Employee } from '../types';

interface DepartmentMenuProps {
  employees: Employee[];
  isOpen: boolean;
  onClose: () => void;
  onSelectEmployee: (employee: Employee) => void;
}

const DEPARTMENTS = ['Tech', 'Marketing', 'Operations', 'Sales', 'CEO', 'CFO', 'CMO'];

export default function DepartmentMenu({
  employees,
  isOpen,
  onClose,
  onSelectEmployee
}: DepartmentMenuProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-2xl max-h-[80vh] overflow-y-auto w-96">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-primary to-secondary p-4 text-white flex justify-between items-center">
          <h2 className="text-xl font-bold">Select Department & Person</h2>
          <button onClick={onClose} className="hover:bg-white hover:bg-opacity-20 p-1 rounded">
            <X size={20} />
          </button>
        </div>

        {/* Departments */}
        <div className="p-4 space-y-3">
          {DEPARTMENTS.map(dept => {
            const deptEmployees = employees.filter(e => e.department === dept);
            return (
              <div key={dept} className="border rounded-lg overflow-hidden">
                <button className="w-full bg-accent bg-opacity-20 p-3 text-left font-semibold text-gray-800 hover:bg-opacity-30 transition">
                  <Users size={16} className="inline mr-2" />
                  {dept} ({deptEmployees.length})
                </button>
                <div className="bg-gray-50 p-2 space-y-1">
                  {deptEmployees.map(emp => (
                    <button
                      key={emp.id}
                      onClick={() => {
                        onSelectEmployee(emp);
                        onClose();
                      }}
                      className="w-full text-left p-2 rounded hover:bg-primary hover:bg-opacity-20 transition"
                    >
                      <div className="font-medium text-gray-900">{emp.name}</div>
                      <div className="text-xs text-gray-500">{emp.email}</div>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
