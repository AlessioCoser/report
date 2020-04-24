const fs = require('fs')
const path = require('path')
const { homedir } = require('os')

module.exports = function(loader, toggl, timeSlotter, asker, config) {
  const moment = loader.load('moment')

  this.run = async () => {
    const clients = await toggl.getClients()
    const client = await asker.chooseClient(clients)
    const monthly = await asker.autocompleteInquire('Pick month', last_months())
    const filename = await asker_inquireInputWithDefault('Where do you want to save the report?', defaultFileName(client, monthly))
    status("... collecting data")
    const summary = await getPdf(client.id, config.togglWorkspace, monthly.start.format('YYYY-MM-DD'), monthly.end.format('YYYY-MM-DD'))
    status("... writing PDF")
    writePdf(filename, summary)
    status("Done!", 36)
  }

  this.help = () => {
    return 'download client report as PDF'
  }

  function writePdf(filename, content) {
    try {
      fs.writeFileSync(filename, content)
    } catch(e) {
      if(e.message.startsWith('ENOENT:')) {
        console.error('Cannot save report: folder not found')
      } else {
        console.error(e.message)
      }
      process.exit(1)
    }
  }

  async function getPdf(client, workspace, start, end) {
    try {
      const url = `https://www.toggl.com/reports/api/v3/workspace/${workspace}/summary/time_entries.pdf`
      return await toggl.rawReportsPost(url, {
        user_agent: 'toggl-tracker',
        client_ids: [client],
        date_format: 'DD-MM-YYYY',
        start_date: start,
        end_date: end,
        grouping: 'projects',
        sub_grouping: 'users',
        billable: true,
        hide_amounts: true,
        hide_rates: true,
        order_by: 'title',
        order_dir: 'asc',
        duration_format: 'improved'
      }, 'arraybuffer')
    } catch(e) {
      console.error(String(e.response.data))
      process.exit(1)
    }
  }

  async function asker_inquireInputWithDefault(message, defaultResponse) {
    const response = await asker.inquire(`${message} \x1b[2m(${defaultResponse})\x1b[0m`, 'input')
    return response.trim() == '' ? defaultResponse : response
  }

  function defaultFileName(client, monthly) {
    return path.join(homedir(), '/Desktop/', `${client.name.toLowerCase()}_report_${monthly.start.format('YYYY-MM')}.pdf`)
  }

  function last_months() {
    let number = 10
    let months = [...Array(number).keys()].map(it => moment().add(-it, 'month'))
    return months.map(it => {
      return {
        description: it.format('YYYY MMMM'),
        start: moment(it).startOf('month'),
        end: moment(it).endOf('month')
      }
    })
  }

  function status(message, color = 2) {
    console.log(`\x1b[${color}m`, message ,'\x1b[0m')
  }
}
