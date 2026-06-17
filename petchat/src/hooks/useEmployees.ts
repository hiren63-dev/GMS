import { useState, useEffect } from 'react'
import { Employee, Department } from '../types'
import { subscribeToEmployees, getEmployeesByDepartment } from '../services/employeeService'

export const useEmployees = () => {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = subscribeToEmployees(employees => {
      setEmployees(employees)
      setLoading(false)
    })

    return unsubscribe
  }, [])

  const getByDepartment = (department: Department) => {
    return employees.filter(emp => emp.department === department)
  }

  return { employees, getByDepartment, loading }
}
