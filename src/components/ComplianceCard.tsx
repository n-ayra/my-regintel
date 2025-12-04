import React from 'react';

interface ComplianceCardProps {
	title: string;
	acronym: string;
	percentage: number;
	status?: string;
	codes: string[];
}

const ComplianceCard: React.FC<ComplianceCardProps> = ({
	title,
	acronym,
	percentage,
	status = 'Compliant',
	codes,
}) => {
	return (
		<div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 w-full max-w-xs">
			<div className="flex justify-between items-start mb-4">
				<div className="flex flex-col">
					<h3 className="text-lg font-semibold text-gray-900 leading-tight">
						{title}
					</h3>
					<span className="text-gray-400 text-sm font-medium mt-0.5">
						{acronym}
					</span>
				</div>

				<div className="flex flex-col items-end">
					<span className="text-2xl font-bold text-orange-500">
						{percentage}%
					</span>
					<span className="text-xs font-medium text-orange-400">
						{status}
					</span>
				</div>
			</div>

			<div className="grid grid-cols-4 gap-2">
				{codes.map((code, index) => (
					<div
						key={index}
						className="flex items-center justify-center py-1 px-1 border border-gray-200 rounded text-xs font-medium text-gray-700 bg-transparent"
					>
						{code}
					</div>
				))}
			</div>
		</div>
	);
};

export default ComplianceCard;
