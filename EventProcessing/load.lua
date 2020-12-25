function onCycle()

end

function onCall(callnum)
	if callnum == 1 then
		return "[POST]{\"type\": \"forecast\", \"source\": \"opweeyozkbvoddlfqnzqjwbhxdnvot\", \"timestamp\": 1566246, \"forecast\": 123, \"forecast_for\": \"hello world\", \"place\": \"myplace\"}URL1PLACEHOLDER"
	elseif callnum == 2 then	
		return "[POST]{\"type\": \"temperature\", \"source\": \"opweeyozkbvoddlfqnzqjwbhxdnvot\", \"timestamp\": 1566246, \"value\": 162}URL1PLACEHOLDER"
	elseif callnum == 3 then	
		return "[POST]{\"type\": \"state_change\", \"source\": \"opweeyozkbvoddlfqnzqjwbhxdnvot\", \"timestamp\": 1566246, \"message\": \"mymessage\"}URL1PLACEHOLDER"
	elseif callnum == 4 then	
		return "[GET]URL2PLACEHOLDER"
	elseif callnum == 5 then	
		return "[GET]URL3PLACEHOLDER"
	else
		return nil;
	end
end
