cognitoTokens = {COGNITO_TOKEN_PLACEHOLDER}
userids = {USER_IDS_PLACEHOLDER}
graphQL = "GRAPHQL_PLACEHOLDER"
chargeURL = "CHARGEURL_PLACEHOLDER"
stripeKeys = {STRIPE_PUBLIC_KEYS_PLACEHOLDER}

tokens = {"tok_visa", "tok_visa_debit", "tok_mastercard", "tok_mastercard_debit", "tok_mastercard_prepaid", "tok_amex", "tok_us", "tok_br", "tok_ca", "tok_mx"}
airports = {"BRU", "SXF", "FRA", "MUC", "HEL", "MAN", "LTN", "SOU", "LGW", "LHR", "GLA"}
--names = {"James", "John", "Robert", "Michael", "William", "David", "Richard", "Joseph", "Thomas", "Charles"}
--zips = {"99501", "90210", "33162", "60606", "42748", "70130", "48202", "89041", "10007", "97210"}
--countries = {"BE", "FR", "IS", "HR", "SE", "ES", "TR", "DE", "IN", "IT", "AT", "RS", "TO", "BY"}
--numbers = {"4242424242424242", "4000056655665556", "5555555555554444", "5105105105105100", "378282246310005", "371449635398431"}
--cvcs = {"123", "321", "234", "345", "456", "567", "678", "789"}
--months = {"01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12"}
--years = {"25", "26", "27", "28", "29", "30"}

searchQuery = "\"query\":\"query GetFlightBySchedule($departureAirportCode: String, $arrivalAirportCodeDepartureDate: ModelFlightByDepartureScheduleCompositeKeyConditionInput, $sortDirection: ModelSortDirection, $filter: ModelFlightFilterInput, $limit: Int, $nextToken: String) {  getFlightBySchedule(departureAirportCode: $departureAirportCode, arrivalAirportCodeDepartureDate: $arrivalAirportCodeDepartureDate, sortDirection: $sortDirection, filter: $filter, limit: $limit, nextToken: $nextToken) {    items {      id      departureDate      departureAirportCode      departureAirportName      departureCity      departureLocale      arrivalDate      arrivalAirportCode      arrivalAirportName      arrivalCity      arrivalLocale      ticketPrice      ticketCurrency      flightNumber      seatCapacity    }    nextToken  }}\",\"variables\":{\"departureAirportCode\":\"DEPTOKEN\",\"arrivalAirportCodeDepartureDate\":{\"beginsWith\":{\"arrivalAirportCode\":\"ARRTOKEN\",\"departureDate\":\"2020-01-06\"}},\"filter\":{\"seatCapacity\":{\"gt\":0}},\"limit\":5,\"nextToken\":null}"
loyaltyQuery = "\"query\":\"query getLoyalty($customer: String) {  getLoyalty(customer: $customer) {    points    level    remainingPoints  }}\",\"variables\":{}"
bookingQuery = "\"query\":\"query GetBookingByStatus($customer: String, $status: ModelStringKeyConditionInput, $sortDirection: ModelSortDirection, $filter: ModelBookingFilterInput, $limit: Int, $nextToken: String) {  getBookingByStatus(customer: $customer, status: $status, sortDirection: $sortDirection, filter: $filter, limit: $limit, nextToken: $nextToken) {    items {      id      status      outboundFlight {        id        departureDate        departureAirportCode        departureAirportName        departureCity        departureLocale        arrivalDate        arrivalAirportCode        arrivalAirportName        arrivalCity        arrivalLocale        ticketPrice        ticketCurrency        flightNumber        seatAllocation        seatCapacity      }      paymentToken      checkedIn      customer      createdAt      bookingReference    }    nextToken  }}\",\"variables\":{\"customer\":\"USER_ID_TOKEN\",\"status\":{\"eq\":\"CONFIRMED\"},\"limit\":3,\"nextToken\":null}"

processQuery = "\"query\":\"mutation ProcessBooking($input: CreateBookingInput!) {  processBooking(input: $input) {    id  }}\",\"variables\":{\"input\":{\"paymentToken\":\"PAYMENTTOKEN\",\"bookingOutboundFlightId\":\"OUTBOUNDTOKEN\", \"stripeKey\":\"STRIPEID_TOKEN\"}}"

tokenizationURL = "https://api.stripe.com/v1/tokens?card[name]=NAMETOKEN&card[address_zip]=ZIPTOKEN&card[address_country]=COUNTRYTOKEN&card[number]=NUMBERTOKEN&card[cvc]=CVCTOKEN&card[exp_month]=MONTHTOKEN&card[exp_year]=YEARTOKEN&key=STRIPE_PUBLIC_KEY_TOKEN"
chargePayload = "\"amount\":AMOUNTTOKEN,\"currency\":\"EUR\",\"stripeToken\":\"STRIPETOKEN\",\"description\":\"Payment by success+1@simulator.amazonses.com\",\"email\":\"success+1@simulator.amazonses.com\", \"stripeKey\":\"STRIPEID_TOKEN\""

flightId = nil
ticketPrice = nil
cognitoToken = nil

function onCycle()
    user = math.random(#cognitoTokens)
    cognitoToken = cognitoTokens[user]
	userid = userids[user]
	stripeId = math.random(#stripeKeys)
	corrStripeId = stripeId - 1
	calls = 1
end

function onCall(callnum)
	if callnum == 1 then
		query = searchQuery:gsub("DEPTOKEN", airports[math.random(#airports)])
		query = query:gsub("ARRTOKEN", airports[math.random(#airports)])
		return "[POST]("..cognitoToken.."){"..query.."}}\",\"variables\":{}}"..graphQL
	elseif callnum == 2 then
		flightIds = html.extractMatches("\\\"id\\\":\\\"","\\\",")
		ticketPrices = html.extractMatches("\\\"ticketPrice\\\":",",")
		if #flightIds == 0 then
		    return nil;
		end
		selected = math.random(#flightIds)
		flightId = flightIds[selected]
		ticketPrice = ticketPrices[selected]
		--url = tokenizationURL:gsub("NAMETOKEN", names[math.random(#names)])
		--url = url:gsub("ZIPTOKEN", zips[math.random(#zips)])
		--url = url:gsub("COUNTRYTOKEN", countries[math.random(#countries)])
		--url = url:gsub("NUMBERTOKEN", numbers[math.random(#numbers)])
		--url = url:gsub("CVCTOKEN", cvcs[math.random(#cvcs)])
		--url = url:gsub("MONTHTOKEN", months[math.random(#months)])
		--url = url:gsub("YEARTOKEN", years[math.random(#years)])
		--url = url:gsub("STRIPE_PUBLIC_KEY_TOKEN", stripeKeys[stripeId])
	    --return "[POST]"..url
--	elseif callnum == 3 then
		if calls == 1 then
			calls = 2
			--token = html.extractMatches("\\\"id\\\": \\\"","\\\",")
			payload = chargePayload:gsub("STRIPETOKEN", tokens[math.random(#tokens)])
			payload = payload:gsub("STRIPEID_TOKEN", corrStripeId)
			payload = payload:gsub("AMOUNTTOKEN", ticketPrice*100)
			return "[POST]{"..payload.."}"..chargeURL
        else		
		    return nil;
		end
	elseif callnum == 3 then
		token = html.extractMatches("\\\"id\\\":\\\"","\\\",")
		query = processQuery:gsub("PAYMENTTOKEN", token[1])
		query = query:gsub("STRIPEID_TOKEN", corrStripeId)
		query = query:gsub("OUTBOUNDTOKEN", flightId)
		return "[POST]("..cognitoToken.."){"..query.."}}\",\"variables\":{}}"..graphQL
	elseif callnum == 4 then
	    query = bookingQuery:gsub("USER_ID_TOKEN", userid)
		return "[POST]("..cognitoToken.."){"..bookingQuery.."}"..graphQL
	elseif callnum == 5 then
	    query = loyaltyQuery:gsub("USER_ID_TOKEN", userid)
		return "[POST]("..cognitoToken.."){"..query.."}"..graphQL
	else
		return nil;
	end
end