import * as admin from 'firebase-admin'
import * as functions from 'firebase-functions'

admin.initializeApp()

const db = admin.firestore()

/**
 * Daily Check-In Bot
 * Runs at a scheduled time (configurable) and creates check-in entries for all employees
 */
export const sendDailyCheckIn = functions
  .pubsub.schedule('0 9 * * *') // 9am UTC (14:30 IST) — adjust as needed
  .timeZone('Asia/Kolkata') // IST timezone
  .onRun(async context => {
    try {
      functions.logger.info('Daily check-in bot started', { timestamp: new Date() })

      // Get all employees
      const employeesSnap = await db.collection('employees').get()

      if (employeesSnap.empty) {
        functions.logger.info('No employees found')
        return
      }

      const checkInPromises = employeesSnap.docs.map(doc => {
        const emp = doc.data()
        return db.collection('checkInResponses').add({
          employeeId: doc.id,
          employeeName: emp.name,
          date: new Date(),
          responses: {
            mood: null,
            isFeelingGood: null,
            workDone: null,
            hasProblems: null,
            suggestions: null,
          },
          status: 'pending',
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        })
      })

      await Promise.all(checkInPromises)

      functions.logger.info(`Created ${employeesSnap.docs.length} check-in entries`)

      // Optional: Send notifications (requires additional setup)
      // This could trigger email, Slack, or push notifications

      return { success: true, checkIns: employeesSnap.docs.length }
    } catch (error) {
      functions.logger.error('Error in daily check-in', error)
      throw error
    }
  })

/**
 * Data Retention Policy
 * Deletes check-in data older than 30 days
 */
export const cleanupOldCheckIns = functions
  .pubsub.schedule('0 2 * * *') // 2am UTC daily
  .timeZone('Asia/Kolkata')
  .onRun(async context => {
    try {
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

      const query = db.collection('checkInResponses').where('date', '<', thirtyDaysAgo)
      const snapshot = await query.get()

      const deletePromises = snapshot.docs.map(doc => doc.ref.delete())
      await Promise.all(deletePromises)

      functions.logger.info(`Deleted ${snapshot.docs.length} old check-in records`)
      return { success: true, deleted: snapshot.docs.length }
    } catch (error) {
      functions.logger.error('Error in cleanup', error)
      throw error
    }
  })
