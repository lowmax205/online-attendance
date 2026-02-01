import { useState, useMemo } from "react";
import academicPrograms from "@/lib/data/academic-programs.json";

export interface Program {
  code: string;
  name: string;
  majors?: string[];
  concentrations?: string[];
}

export interface Department {
  code: string;
  name: string;
  programs: Program[];
}

export interface AcademicOption {
  value: string;
  label: string;
}

/**
 * Hook for managing academic program selection
 * Provides department options, dynamic course/program options based on selected department,
 * and utilities for managing academic program state
 */
export function useAcademicPrograms(initialDepartment?: string) {
  const [selectedDepartment, setSelectedDepartment] = useState<string>(
    initialDepartment || "",
  );

  // Memoize department options
  const departmentOptions = useMemo<AcademicOption[]>(() => {
    return [
      { value: "all", label: "All Departments/Colleges" },
      ...academicPrograms.departments.map((dept) => ({
        value: dept.code,
        label: `${dept.code} - ${dept.name}`,
      })),
    ];
  }, []);

  // Memoize course options based on selected department
  const courseOptions = useMemo<AcademicOption[]>(() => {
    if (selectedDepartment === "all" || !selectedDepartment) {
      const allPrograms = academicPrograms.departments.flatMap((dept) =>
        dept.programs.map((program) => ({
          value: program.code,
          label: `${program.code} - ${program.name}`,
        })),
      );
      return [{ value: "all", label: "All Courses/Programs" }, ...allPrograms];
    }

    const dept = academicPrograms.departments.find(
      (d) => d.code === selectedDepartment,
    );
    if (!dept) {
      return [{ value: "all", label: "All Courses/Programs" }];
    }

    return [
      { value: "all", label: "All Courses/Programs" },
      ...dept.programs.map((program) => ({
        value: program.code,
        label: `${program.code} - ${program.name}`,
      })),
    ];
  }, [selectedDepartment]);

  // Get programs for a specific department
  const getProgramsForDepartment = (departmentCode: string): Program[] => {
    const dept = academicPrograms.departments.find(
      (d) => d.code === departmentCode,
    );
    return dept ? dept.programs : [];
  };

  // Handle department change
  const handleDepartmentChange = (value: string): void => {
    setSelectedDepartment(value);
  };

  // Reset to initial state
  const reset = (): void => {
    setSelectedDepartment(initialDepartment || "");
  };

  return {
    selectedDepartment,
    setSelectedDepartment,
    departmentOptions,
    courseOptions,
    getProgramsForDepartment,
    handleDepartmentChange,
    reset,
    departments: academicPrograms.departments,
  };
}
