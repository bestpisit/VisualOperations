'use client';

import { formatDateThai } from "@/lib/utils";
import { AccessLog } from "@prisma/client";
import { useEffect, useState } from "react";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DateTime } from "luxon";

const AccessLogsPage = () => {
    const [logs, setLogs] = useState<AccessLog[]>([]);
    const [cursor, setCursor] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const fetchLogs = async (nextCursor: string | null) => {
        setLoading(true);
        const res = await fetch(`/api/access-control/access-log?cursor=${nextCursor || ''}`);
        const data = await res.json();

        setLogs((prev) => [...prev, ...data.logs]);
        setCursor(data.nextCursor);
        setLoading(false);
    };

    useEffect(() => {
        fetchLogs(null);  // Initial fetch
    }, []);

    return (
        <div>
            <h1 className="text-2xl font-semibold mb-4">Access Logs</h1>
            <ScrollArea className="overflow-auto">
                <Table className="w-full relative bg-slate-50 border rounded-md">
                    <TableHeader>
                        <TableRow className="bg-slate-100 border-t border-slate-200">
                            <TableHead className="py-2 text-slate-500 text-base font-normal text-center">
                                Date
                            </TableHead>
                            <TableHead className="py-2 text-slate-500 text-base font-normal text-center">
                                User
                            </TableHead>
                            <TableHead className="py-2 text-slate-500 text-base font-normal text-center">
                                Role
                            </TableHead>
                            <TableHead className="py-2 text-slate-500 text-base font-normal text-center">
                                Method
                            </TableHead>
                            <TableHead className="grow py-2 text-slate-500 text-base font-normal text-center">
                                Path
                            </TableHead>
                            <TableHead className="py-2 text-slate-500 text-base font-normal text-center">
                                IP Address
                            </TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {logs.map((log) => (
                            <TableRow
                                key={log.id}
                                className="hover:bg-violet-50 transition h-10 border-t border-slate-200"
                            >
                                <TableCell className="text-center py-2 whitespace-nowrap">
                                    {formatDateThai(new Date(log.timestamp))} {DateTime.fromJSDate(new Date(log.timestamp), { zone: 'Asia/Bangkok' }).toFormat('HH:mm:ss')}
                                </TableCell>
                                <TableCell className="text-center py-2 whitespace-nowrap">
                                    {log.userEmail}
                                </TableCell>
                                <TableCell className="text-center py-2 whitespace-nowrap">
                                    {log.userRole}
                                </TableCell>
                                <TableCell className="text-center py-2 whitespace-nowrap">
                                    {log.method}
                                </TableCell>
                                <TableCell className="text-left py-2">
                                    {log.path}
                                </TableCell>
                                <TableCell className="text-center py-2 whitespace-nowrap">
                                    {log.ip}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
                {cursor && (
                    <div className="text-center mt-4">
                        <button
                            onClick={() => fetchLogs(cursor)}
                            disabled={loading}
                            className="px-6 py-2 bg-violet-500 text-white rounded-md hover:bg-violet-600 transition disabled:bg-gray-300"
                        >
                            {loading ? 'Loading...' : 'Load More'}
                        </button>
                    </div>
                )}
                <ScrollBar orientation="horizontal" />
            </ScrollArea>
        </div>
    );
}

export default AccessLogsPage;