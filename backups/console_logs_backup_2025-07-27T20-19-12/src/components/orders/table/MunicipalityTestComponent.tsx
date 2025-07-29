import { memo } from "react";
import { useMunicipalityResolver } from "./useMunicipalityResolver";

const MunicipalityTestComponent = memo(() => {
  const { getMunicipalityDisplayName } = useMunicipalityResolver();

  // Test cases
  const testCases = [
    { id: "505", province: "1", description: "البلدية 505 من الولاية 1" },
    { id: 505, province: 1, description: "البلدية 505 (رقم) من الولاية 1" },
    { id: "50", province: "1", description: "البلدية 50 من الولاية 1 (محلي)" },
  ];

  return (
    <div className="p-4 border rounded-md bg-gray-50">
      <h4 className="font-semibold mb-3">اختبار حل البلديات:</h4>
      <div className="space-y-2">
        {testCases.map((testCase, index) => (
          <div key={index} className="text-sm">
            <span className="font-medium">{testCase.description}: </span>
            <span className="text-blue-600">
              {getMunicipalityDisplayName(testCase.id, testCase.province)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
});

MunicipalityTestComponent.displayName = "MunicipalityTestComponent";

export default MunicipalityTestComponent; 